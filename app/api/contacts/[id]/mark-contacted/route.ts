import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contact = await prisma.contact.update({
    where: { id: Number(id) },
    data: { lastContactDate: new Date() },
  });
  return NextResponse.json({
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
  });
}
