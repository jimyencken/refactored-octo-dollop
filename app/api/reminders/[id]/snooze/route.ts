import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const minutes = Number(req.nextUrl.searchParams.get("minutes") || "15");
  const reminder = await prisma.reminder.findUniqueOrThrow({ where: { id: Number(id) } });
  const newDue = new Date(reminder.dueAt.getTime() + minutes * 60000);
  const updated = await prisma.reminder.update({
    where: { id: Number(id) },
    data: { dueAt: newDue, status: "pending" },
  });
  return NextResponse.json({
    id: updated.id, title: updated.title, description: updated.description,
    due_at: updated.dueAt, recurrence_rule: updated.recurrenceRule,
    status: updated.status, contact_id: updated.contactId, created_at: updated.createdAt,
  });
}
