import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("relationship_type");
  const where = type ? { relationshipType: type } : {};
  const contacts = await prisma.contact.findMany({ where, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(
    contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      relationship_type: c.relationshipType,
      notes: c.notes,
      last_contact_date: c.lastContactDate,
      follow_up_frequency_days: c.followUpFrequencyDays,
      created_at: c.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const contact = await prisma.contact.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      company: body.company || null,
      relationshipType: body.relationship_type || "acquaintance",
      notes: body.notes || null,
      followUpFrequencyDays: body.follow_up_frequency_days || null,
    },
  });
  return NextResponse.json(
    {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      relationship_type: contact.relationshipType,
      notes: contact.notes,
      last_contact_date: contact.lastContactDate,
      follow_up_frequency_days: contact.followUpFrequencyDays,
      created_at: contact.createdAt,
    },
    { status: 201 }
  );
}
