from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Contact, Message, MessageStatus
from app.schemas import DraftRequest, MessageCreate, MessageOut, MessageUpdate

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("", response_model=list[MessageOut])
async def list_messages(
    status: str | None = None,
    contact_id: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Message).order_by(Message.created_at.desc())
    if status:
        stmt = stmt.where(Message.status == status)
    if contact_id:
        stmt = stmt.where(Message.contact_id == contact_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=MessageOut, status_code=201)
async def create_message(data: MessageCreate, db: AsyncSession = Depends(get_db)):
    contact = await db.get(Contact, data.contact_id)
    if not contact:
        raise HTTPException(404, "Contact not found")
    message = Message(**data.model_dump())
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


@router.get("/{message_id}", response_model=MessageOut)
async def get_message(message_id: int, db: AsyncSession = Depends(get_db)):
    message = await db.get(Message, message_id)
    if not message:
        raise HTTPException(404, "Message not found")
    return message


@router.patch("/{message_id}", response_model=MessageOut)
async def update_message(
    message_id: int, data: MessageUpdate, db: AsyncSession = Depends(get_db)
):
    message = await db.get(Message, message_id)
    if not message:
        raise HTTPException(404, "Message not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(message, key, val)
    await db.commit()
    await db.refresh(message)
    return message


@router.post("/{message_id}/mark-sent", response_model=MessageOut)
async def mark_sent(message_id: int, db: AsyncSession = Depends(get_db)):
    message = await db.get(Message, message_id)
    if not message:
        raise HTTPException(404, "Message not found")
    message.status = MessageStatus.sent
    await db.commit()
    await db.refresh(message)
    return message


@router.post("/draft-assist", response_model=MessageOut, status_code=201)
async def draft_assist(data: DraftRequest, db: AsyncSession = Depends(get_db)):
    """AI-assisted message drafting based on context and tone."""
    contact = await db.get(Contact, data.contact_id)
    if not contact:
        raise HTTPException(404, "Contact not found")

    tone_map = {
        "professional": "Dear",
        "casual": "Hey",
        "formal": "Dear Mr./Ms.",
    }
    greeting = tone_map.get(data.tone, "Hello")

    body = (
        f"{greeting} {contact.name},\n\n"
        f"Re: {data.context}\n\n"
        f"I wanted to reach out regarding {data.context}. "
    )

    if contact.relationship_type.value == "business":
        body += "I look forward to discussing this further at your earliest convenience."
    elif contact.relationship_type.value == "personal":
        body += "Let me know when you're free to catch up!"
    else:
        body += "Please let me know your thoughts."

    body += f"\n\nBest regards"

    message = Message(
        contact_id=contact.id,
        subject=f"Re: {data.context[:80]}",
        body=body,
        channel=data.channel,
        status=MessageStatus.draft,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


@router.delete("/{message_id}", status_code=204)
async def delete_message(message_id: int, db: AsyncSession = Depends(get_db)):
    message = await db.get(Message, message_id)
    if not message:
        raise HTTPException(404, "Message not found")
    await db.delete(message)
    await db.commit()
