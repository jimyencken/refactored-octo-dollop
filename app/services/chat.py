import logging

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
offer to create reminders or draft messages. Always be professional yet warm.
Keep responses brief — this is a mobile chat interface."""


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

    result = await db.execute(select(Contact).order_by(Contact.updated_at.desc()).limit(5))
    contacts = result.scalars().all()
    if contacts:
        items = [f"- {c.name} ({c.relationship_type.value})" for c in contacts]
        parts.append("Recent contacts:\n" + "\n".join(items))

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
    """Generate a response — tries Claude API first, then generic LLM, then fallback."""
    from app.config import settings

    # Try Claude API (Anthropic SDK) first
    if settings.anthropic_api_key:
        try:
            return await _call_claude(conversation, user_message, context)
        except Exception as e:
            logger.warning("Claude API call failed: %s", e)

    # Try generic OpenAI-compatible LLM endpoint
    if settings.llm_api_key and settings.llm_base_url:
        try:
            return await _call_llm(conversation, user_message, context)
        except Exception as e:
            logger.warning("LLM call failed: %s", e)

    # Built-in fallback
    return _fallback_response(user_message, context)


async def _call_claude(conversation: Conversation, user_message: str, context: str) -> str:
    """Call Claude via the Anthropic SDK."""
    import anthropic

    from app.config import settings

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    messages = []
    for turn in (conversation.turns or [])[-20:]:
        messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": user_message})

    system_content = f"{SYSTEM_PROMPT}\n\nCurrent user context:\n{context}"

    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=1024,
        system=system_content,
        messages=messages,
    )

    return response.content[0].text


async def _call_llm(conversation: Conversation, user_message: str, context: str) -> str:
    """Call an external OpenAI-compatible LLM API for response generation."""
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


def _fallback_response(user_message: str, context: str) -> str:
    """Built-in keyword-based responses when no LLM is configured."""
    msg_lower = user_message.lower()

    if any(w in msg_lower for w in ["remind", "schedule", "task"]):
        return (
            f"I can help with that! Here's your schedule:\n\n{context}\n\n"
            "To create a reminder, use the Reminders tab or tell me what and when."
        )

    if any(w in msg_lower for w in ["draft", "write", "compose", "message", "email"]):
        return (
            "I can help draft a message! Tell me:\n"
            "- Who is it for?\n"
            "- What's the purpose?\n"
            "- What tone? (professional, casual, formal)"
        )

    if any(w in msg_lower for w in ["summary", "digest", "overview", "status"]):
        return f"Here's your overview:\n\n{context}"

    if any(w in msg_lower for w in ["hello", "hi", "hey"]):
        return f"Hey! Here's a quick look:\n\n{context}\n\nWhat can I help with?"

    return (
        f"Here's your current context:\n{context}\n\n"
        "I can help with reminders, messages, contacts, and scheduling."
    )
