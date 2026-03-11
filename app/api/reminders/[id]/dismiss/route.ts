import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updated = await prisma.reminder.update({
    where: { id: Number(id) },
    data: { status: "dismissed" },
  });
  return NextResponse.json({
    id: updated.id, title: updated.title, description: updated.description,
    due_at: updated.dueAt, recurrence_rule: updated.recurrenceRule,
    status: updated.status, contact_id: updated.contactId, created_at: updated.createdAt,
  });
}
