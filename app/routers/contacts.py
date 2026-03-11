from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Contact
from app.schemas import ContactCreate, ContactOut, ContactUpdate

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactOut])
async def list_contacts(
    relationship_type: str | None = None, db: AsyncSession = Depends(get_db)
):
    stmt = select(Contact).order_by(Contact.name)
    if relationship_type:
        stmt = stmt.where(Contact.relationship_type == relationship_type)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ContactOut, status_code=201)
async def create_contact(data: ContactCreate, db: AsyncSession = Depends(get_db)):
    contact = Contact(**data.model_dump())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.get("/{contact_id}", response_model=ContactOut)
async def get_contact(contact_id: int, db: AsyncSession = Depends(get_db)):
    contact = await db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(404, "Contact not found")
    return contact


@router.patch("/{contact_id}", response_model=ContactOut)
async def update_contact(contact_id: int, data: ContactUpdate, db: AsyncSession = Depends(get_db)):
    contact = await db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(404, "Contact not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(contact, key, val)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(contact_id: int, db: AsyncSession = Depends(get_db)):
    contact = await db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(404, "Contact not found")
    await db.delete(contact)
    await db.commit()


@router.post("/{contact_id}/mark-contacted", response_model=ContactOut)
async def mark_contacted(contact_id: int, db: AsyncSession = Depends(get_db)):
    contact = await db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(404, "Contact not found")
    contact.last_contact_date = datetime.utcnow()
    await db.commit()
    await db.refresh(contact)
    return contact
