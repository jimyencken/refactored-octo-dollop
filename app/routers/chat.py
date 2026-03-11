from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Conversation
from app.schemas import ChatRequest, ChatResponse, ConversationDetail, ConversationOut
from app.services.chat import get_or_create_conversation, process_chat

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).order_by(Conversation.updated_at.desc()).limit(50)
    )
    return result.scalars().all()


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(conversation_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.turns))
        .where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        from fastapi import HTTPException

        raise HTTPException(404, "Conversation not found")
    return conv


@router.post("/send", response_model=ChatResponse)
async def send_message(data: ChatRequest, db: AsyncSession = Depends(get_db)):
    conversation = await get_or_create_conversation(db, data.conversation_id)
    reply = await process_chat(db, conversation, data.message)
    return ChatResponse(conversation_id=conversation.id, reply=reply)


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: int, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException

    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")
    await db.delete(conv)
    await db.commit()
