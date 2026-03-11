from datetime import datetime

from pydantic import BaseModel

from app.models import MessageStatus, NotificationType, RelationshipType, ReminderStatus


# --- Contacts ---
class ContactCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    relationship_type: RelationshipType = RelationshipType.acquaintance
    notes: str | None = None
    follow_up_frequency_days: int | None = None


class ContactUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    relationship_type: RelationshipType | None = None
    notes: str | None = None
    follow_up_frequency_days: int | None = None
    last_contact_date: datetime | None = None


class ContactOut(BaseModel):
    id: int
    name: str
    email: str | None
    phone: str | None
    company: str | None
    relationship_type: RelationshipType
    notes: str | None
    last_contact_date: datetime | None
    follow_up_frequency_days: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Reminders ---
class ReminderCreate(BaseModel):
    title: str
    description: str | None = None
    due_at: datetime
    recurrence_rule: str | None = None
    contact_id: int | None = None


class ReminderUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_at: datetime | None = None
    recurrence_rule: str | None = None
    status: ReminderStatus | None = None


class ReminderOut(BaseModel):
    id: int
    title: str
    description: str | None
    due_at: datetime
    recurrence_rule: str | None
    status: ReminderStatus
    contact_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Messages ---
class MessageCreate(BaseModel):
    contact_id: int
    subject: str | None = None
    body: str
    channel: str = "email"
    scheduled_send_at: datetime | None = None


class MessageUpdate(BaseModel):
    subject: str | None = None
    body: str | None = None
    channel: str | None = None
    status: MessageStatus | None = None
    scheduled_send_at: datetime | None = None


class MessageOut(BaseModel):
    id: int
    contact_id: int
    subject: str | None
    body: str
    channel: str
    status: MessageStatus
    scheduled_send_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DraftRequest(BaseModel):
    contact_id: int
    context: str
    tone: str = "professional"
    channel: str = "email"


# --- Conversations ---
class ConversationOut(BaseModel):
    id: int
    title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TurnOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: int
    title: str | None
    created_at: datetime
    turns: list[TurnOut]

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str
    conversation_id: int | None = None


class ChatResponse(BaseModel):
    conversation_id: int
    reply: str


# --- Notifications ---
class NotificationOut(BaseModel):
    id: int
    title: str
    body: str
    notification_type: NotificationType
    is_read: bool
    action_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh_key: str
    auth_key: str
