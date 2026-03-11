import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.database import engine
from app.models import Base
from app.routers import chat, contacts, messages, notifications, reminders
from app.services.scheduler import check_due_reminders, check_follow_up_contacts, generate_daily_digest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")

    scheduler.add_job(check_due_reminders, "interval", minutes=1, id="check_reminders")
    scheduler.add_job(check_follow_up_contacts, "interval", hours=1, id="check_follow_ups")
    scheduler.add_job(generate_daily_digest, "cron", hour=8, minute=0, id="daily_digest")
    scheduler.start()
    logger.info("Background scheduler started")

    yield

    scheduler.shutdown()
    await engine.dispose()


app = FastAPI(
    title="Productivity Assistant",
    description="Proactive personal assistant for scheduling, reminders, message drafting, and relationship management",
    version="1.0.0",
    lifespan=lifespan,
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

app.include_router(contacts.router)
app.include_router(reminders.router)
app.include_router(messages.router)
app.include_router(chat.router)
app.include_router(notifications.router)


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/health")
async def health():
    return {"status": "ok"}
