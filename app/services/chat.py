import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Contact,
    Conversation,
    ConversationTurn,
    Message,
    MessageStatus,
    Reminder,
    ReminderStatus,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a proactive personal productivity assistant. You help with:
- Scheduling and managing reminders
- Drafting and reviewing messages for business and personal contacts
- Tracking relationships and follow-ups
- Providing daily summaries and availability insights

Be concise, helpful, and proactive. When the user mentions tasks, dates, or people,
offer to create reminders or draft messages. Always be professional yet warm."""


async def get_or_create_conversation(
    db: AsyncSession, conversation_id: int | None = None
) -> Conversation:
    if conversation_id:
        result = await db.execute(
            select(Conversation)
            .options(selectinload(Conversation.turns))
            .where(Conversation.id == conversation_id)
        )
        conv = result.scalar_one_or_none()
        if conv:
            return conv

    conv = Conversation(title="New conversation")
    db.add(conv)
    await db.flush()
    return conv


async def process_chat(db: AsyncSession, conversation: Conversation, user_message: str) -> str:
    """Process a chat message and return the assistant response."""
    user_turn = ConversationTurn(
        conversation_id=conversation.id, role="user", content=user_message
    )
    db.add(user_turn)
    await db.flush()

    context = await _build_context(db)
    response = await _generate_response(conversation, user_message, context)

    assistant_turn = ConversationTurn(
        conversation_id=conversation.id, role="assistant", content=response
    )
    db.add(assistant_turn)

    if not conversation.title or conversation.title == "New conversation":
        conversation.title = user_message[:80]

    await db.commit()
    return response


async def _build_context(db: AsyncSession) -> str:
    """Build context from the user's data for the assistant."""
    parts = []

    # Pending reminders
    result = await db.execute(
        select(Reminder)
        .where(Reminder.status == ReminderStatus.pending)
        .order_by(Reminder.due_at)
        .limit(10)
    )
    reminders = result.scalars().all()
    if reminders:
        items = [f"- {r.title} (due: {r.due_at.strftime('%Y-%m-%d %H:%M')})" for r in reminders]
        parts.append("Upcoming reminders:\n" + "\n".join(items))

    # Recent contacts
    result = await db.execute(select(Contact).order_by(Contact.updated_at.desc()).limit(5))
    contacts = result.scalars().all()
    if contacts:
        items = [f"- {c.name} ({c.relationship_type.value})" for c in contacts]
        parts.append("Recent contacts:\n" + "\n".join(items))

    # Draft messages
    result = await db.execute(
        select(Message).where(Message.status == MessageStatus.draft).limit(5)
    )
    drafts = result.scalars().all()
    if drafts:
        parts.append(f"You have {len(drafts)} draft message(s) pending review.")

    return "\n\n".join(parts) if parts else "No current items."


async def _generate_response(
    conversation: Conversation, user_message: str, context: str
) -> str:
    """Generate a response using built-in logic or LLM API."""
    from app.config import settings

    msg_lower = user_message.lower()

    # Built-in command handling for when no LLM is configured
    if any(w in msg_lower for w in ["remind", "schedule", "task"]):
        return (
            f"I can help with that! Here's what I know about your schedule:\n\n{context}\n\n"
            "To create a reminder, use the Reminders section in the app, or tell me:\n"
            "- What to remind you about\n"
            "- When it's due\n"
            "- Who it relates to (optional)"
        )

    if any(w in msg_lower for w in ["draft", "write", "compose", "message", "email"]):
        return (
            "I'd be happy to help draft a message! Please tell me:\n"
            "- Who is it for?\n"
            "- What's the context or purpose?\n"
            "- What tone would you prefer? (professional, casual, formal)\n\n"
            "You can also go to the Messages section to draft and manage messages."
        )

    if any(w in msg_lower for w in ["summary", "digest", "overview", "status"]):
        return f"Here's your current overview:\n\n{context}"

    if any(w in msg_lower for w in ["hello", "hi", "hey"]):
        return (
            f"Hello! I'm your productivity assistant. Here's a quick overview:\n\n{context}\n\n"
            "How can I help you today?"
        )

    # If LLM API is configured, use it
    if settings.llm_api_key and settings.llm_base_url:
        try:
            return await _call_llm(conversation, user_message, context)
        except Exception as e:
            logger.warning("LLM call failed: %s", e)

    return (
        f"I understand you're asking about: \"{user_message}\"\n\n"
        f"Here's your current context:\n{context}\n\n"
        "I can help with reminders, message drafting, contact follow-ups, and scheduling. "
        "What would you like to do?"
    )


async def _call_llm(conversation: Conversation, user_message: str, context: str) -> str:
    """Call an external LLM API for response generation."""
    import httpx

    from app.config import settings

    messages = [{"role": "system", "content": f"{SYSTEM_PROMPT}\n\nUser context:\n{context}"}]
    for turn in (conversation.turns or [])[-20:]:
        messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": user_message})

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.llm_base_url}/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json={"model": "default", "messages": messages, "max_tokens": 1024},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
