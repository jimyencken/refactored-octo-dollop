"""Integration tests for the Productivity Assistant API."""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import app
from app.models import Base

TEST_DB_URL = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(TEST_DB_URL, echo=False)
test_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with test_session() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_create_and_list_contacts(client):
    resp = await client.post("/api/contacts", json={
        "name": "Alice Smith",
        "email": "alice@example.com",
        "relationship_type": "business",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Alice Smith"
    assert data["relationship_type"] == "business"

    resp = await client.get("/api/contacts")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_create_and_list_reminders(client):
    resp = await client.post("/api/reminders", json={
        "title": "Team meeting",
        "due_at": "2026-03-15T10:00:00",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Team meeting"
    assert data["status"] == "pending"

    resp = await client.get("/api/reminders")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_create_message_requires_contact(client):
    resp = await client.post("/api/contacts", json={"name": "Bob"})
    contact_id = resp.json()["id"]

    resp = await client.post("/api/messages", json={
        "contact_id": contact_id,
        "body": "Hello Bob, following up on our last call.",
        "channel": "email",
    })
    assert resp.status_code == 201
    assert resp.json()["status"] == "draft"


@pytest.mark.asyncio
async def test_chat_send(client):
    resp = await client.post("/api/chat/send", json={"message": "Hello!"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["conversation_id"] is not None
    assert len(data["reply"]) > 0


@pytest.mark.asyncio
async def test_notifications_unread_count(client):
    resp = await client.get("/api/notifications/unread-count")
    assert resp.status_code == 200
    assert resp.json()["count"] == 0


@pytest.mark.asyncio
async def test_draft_assist(client):
    resp = await client.post("/api/contacts", json={
        "name": "Carol",
        "relationship_type": "business",
    })
    contact_id = resp.json()["id"]

    resp = await client.post("/api/messages/draft-assist", json={
        "contact_id": contact_id,
        "context": "project proposal review",
        "tone": "professional",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "Carol" in data["body"]
    assert data["status"] == "draft"


@pytest.mark.asyncio
async def test_reminder_snooze_and_dismiss(client):
    resp = await client.post("/api/reminders", json={
        "title": "Snooze test",
        "due_at": "2026-03-15T10:00:00",
    })
    rid = resp.json()["id"]

    resp = await client.post(f"/api/reminders/{rid}/snooze?minutes=30")
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"

    resp = await client.post(f"/api/reminders/{rid}/dismiss")
    assert resp.status_code == 200
    assert resp.json()["status"] == "dismissed"


@pytest.mark.asyncio
async def test_contact_mark_contacted(client):
    resp = await client.post("/api/contacts", json={"name": "Dave"})
    cid = resp.json()["id"]

    resp = await client.post(f"/api/contacts/{cid}/mark-contacted")
    assert resp.status_code == 200
    assert resp.json()["last_contact_date"] is not None


@pytest.mark.asyncio
async def test_conversation_persistence(client):
    resp1 = await client.post("/api/chat/send", json={"message": "First message"})
    conv_id = resp1.json()["conversation_id"]

    resp2 = await client.post("/api/chat/send", json={
        "message": "Second message",
        "conversation_id": conv_id,
    })
    assert resp2.json()["conversation_id"] == conv_id

    resp3 = await client.get(f"/api/chat/conversations/{conv_id}")
    assert resp3.status_code == 200
    turns = resp3.json()["turns"]
    assert len(turns) == 4  # 2 user + 2 assistant turns
