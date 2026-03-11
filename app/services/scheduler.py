import json
import logging
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models import (
    Contact,
    Notification,
    NotificationType,
    PushSubscription,
    Reminder,
    ReminderStatus,
)

logger = logging.getLogger(__name__)


async def check_due_reminders():
    """Check for reminders that are due and create notifications."""
    async with async_session() as db:
        now = datetime.utcnow()
        stmt = select(Reminder).where(
            Reminder.status == ReminderStatus.pending,
            Reminder.due_at <= now,
        )
        result = await db.execute(stmt)
        reminders = result.scalars().all()

        for reminder in reminders:
            notification = Notification(
                title=f"Reminder: {reminder.title}",
                body=reminder.description or reminder.title,
                notification_type=NotificationType.reminder,
                action_url=f"/reminders/{reminder.id}",
            )
            db.add(notification)
            reminder.status = ReminderStatus.triggered

            await _send_push_notification(db, notification.title, notification.body)

        if reminders:
            await db.commit()
            logger.info("Processed %d due reminders", len(reminders))


async def check_follow_up_contacts():
    """Check for contacts that are overdue for follow-up and notify."""
    async with async_session() as db:
        now = datetime.utcnow()
        stmt = select(Contact).where(
            Contact.follow_up_frequency_days.isnot(None),
            Contact.last_contact_date.isnot(None),
        )
        result = await db.execute(stmt)
        contacts = result.scalars().all()

        for contact in contacts:
            days_since = (now - contact.last_contact_date).days
            if days_since >= contact.follow_up_frequency_days:
                existing = await db.execute(
                    select(Notification).where(
                        Notification.notification_type == NotificationType.follow_up,
                        Notification.action_url == f"/contacts/{contact.id}",
                        Notification.is_read == False,
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                notification = Notification(
                    title=f"Follow up with {contact.name}",
                    body=f"It's been {days_since} days since your last contact with {contact.name}.",
                    notification_type=NotificationType.follow_up,
                    action_url=f"/contacts/{contact.id}",
                )
                db.add(notification)
                await _send_push_notification(db, notification.title, notification.body)

        await db.commit()


async def generate_daily_digest():
    """Create a daily digest notification summarizing upcoming tasks."""
    async with async_session() as db:
        now = datetime.utcnow()
        tomorrow = now + timedelta(days=1)

        stmt = select(Reminder).where(
            Reminder.status == ReminderStatus.pending,
            Reminder.due_at <= tomorrow,
            Reminder.due_at > now,
        )
        result = await db.execute(stmt)
        upcoming = result.scalars().all()

        if upcoming:
            items = "\n".join(f"• {r.title} (due {r.due_at.strftime('%H:%M')})" for r in upcoming)
            notification = Notification(
                title="Daily Digest",
                body=f"You have {len(upcoming)} upcoming items:\n{items}",
                notification_type=NotificationType.digest,
                action_url="/reminders",
            )
            db.add(notification)
            await db.commit()
            await _send_push_notification(db, notification.title, notification.body)


async def _send_push_notification(db: AsyncSession, title: str, body: str):
    """Send push notifications to all registered subscriptions."""
    try:
        from pywebpush import webpush

        from app.config import settings

        if not settings.vapid_private_key:
            return

        stmt = select(PushSubscription)
        result = await db.execute(stmt)
        subs = result.scalars().all()

        for sub in subs:
            subscription_info = {
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh_key, "auth": sub.auth_key},
            }
            try:
                webpush(
                    subscription_info,
                    data=json.dumps({"title": title, "body": body}),
                    vapid_private_key=settings.vapid_private_key,
                    vapid_claims={"sub": settings.vapid_email},
                )
            except Exception as e:
                logger.warning("Push notification failed for %s: %s", sub.endpoint, e)
    except ImportError:
        logger.debug("pywebpush not installed, skipping push notifications")
