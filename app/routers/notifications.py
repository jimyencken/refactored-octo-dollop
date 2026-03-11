from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Notification, PushSubscription
from app.schemas import NotificationOut, PushSubscriptionCreate

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    unread_only: bool = False, db: AsyncSession = Depends(get_db)
):
    stmt = select(Notification).order_by(Notification.created_at.desc()).limit(100)
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/unread-count")
async def unread_count(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count(Notification.id)).where(Notification.is_read == False)
    )
    return {"count": result.scalar()}


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(notification_id: int, db: AsyncSession = Depends(get_db)):
    notification = await db.get(Notification, notification_id)
    if not notification:
        raise HTTPException(404, "Notification not found")
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification


@router.post("/read-all", status_code=204)
async def mark_all_read(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification).where(Notification.is_read == False)
    )
    for n in result.scalars().all():
        n.is_read = True
    await db.commit()


@router.post("/push-subscription", status_code=201)
async def subscribe_push(data: PushSubscriptionCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == data.endpoint)
    )
    if existing.scalar_one_or_none():
        return {"status": "already subscribed"}

    sub = PushSubscription(
        endpoint=data.endpoint,
        p256dh_key=data.p256dh_key,
        auth_key=data.auth_key,
    )
    db.add(sub)
    await db.commit()
    return {"status": "subscribed"}
