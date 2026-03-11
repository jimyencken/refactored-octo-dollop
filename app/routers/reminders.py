from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Reminder, ReminderStatus
from app.schemas import ReminderCreate, ReminderOut, ReminderUpdate

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


@router.get("", response_model=list[ReminderOut])
async def list_reminders(
    status: str | None = None, db: AsyncSession = Depends(get_db)
):
    stmt = select(Reminder).order_by(Reminder.due_at)
    if status:
        stmt = stmt.where(Reminder.status == status)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ReminderOut, status_code=201)
async def create_reminder(data: ReminderCreate, db: AsyncSession = Depends(get_db)):
    reminder = Reminder(**data.model_dump())
    db.add(reminder)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.get("/{reminder_id}", response_model=ReminderOut)
async def get_reminder(reminder_id: int, db: AsyncSession = Depends(get_db)):
    reminder = await db.get(Reminder, reminder_id)
    if not reminder:
        raise HTTPException(404, "Reminder not found")
    return reminder


@router.patch("/{reminder_id}", response_model=ReminderOut)
async def update_reminder(
    reminder_id: int, data: ReminderUpdate, db: AsyncSession = Depends(get_db)
):
    reminder = await db.get(Reminder, reminder_id)
    if not reminder:
        raise HTTPException(404, "Reminder not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(reminder, key, val)
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.post("/{reminder_id}/dismiss", response_model=ReminderOut)
async def dismiss_reminder(reminder_id: int, db: AsyncSession = Depends(get_db)):
    reminder = await db.get(Reminder, reminder_id)
    if not reminder:
        raise HTTPException(404, "Reminder not found")
    reminder.status = ReminderStatus.dismissed
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.post("/{reminder_id}/snooze", response_model=ReminderOut)
async def snooze_reminder(reminder_id: int, minutes: int = 15, db: AsyncSession = Depends(get_db)):
    from datetime import timedelta

    reminder = await db.get(Reminder, reminder_id)
    if not reminder:
        raise HTTPException(404, "Reminder not found")
    reminder.status = ReminderStatus.snoozed
    reminder.due_at = reminder.due_at + timedelta(minutes=minutes)
    reminder.status = ReminderStatus.pending
    await db.commit()
    await db.refresh(reminder)
    return reminder


@router.delete("/{reminder_id}", status_code=204)
async def delete_reminder(reminder_id: int, db: AsyncSession = Depends(get_db)):
    reminder = await db.get(Reminder, reminder_id)
    if not reminder:
        raise HTTPException(404, "Reminder not found")
    await db.delete(reminder)
    await db.commit()
