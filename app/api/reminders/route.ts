import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const where = status ? { status } : {};
    const reminders = await prisma.reminder.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json(
      reminders.map((r) => ({
        id: r.id, title: r.title, description: r.description, due_at: r.dueAt,
        recurrence_rule: r.recurrenceRule, status: r.status,
        contact_id: r.contactId, created_at: r.createdAt,
      }))
    );
  } catch { return NextResponse.json([]); }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const reminder = await prisma.reminder.create({
    data: {
      title: body.title,
      description: body.description || null,
      dueAt: new Date(body.due_at),
      recurrenceRule: body.recurrence_rule || null,
      contactId: body.contact_id || null,
    },
  });
  return NextResponse.json(
    {
      id: reminder.id,
      title: reminder.title,
      description: reminder.description,
      due_at: reminder.dueAt,
      recurrence_rule: reminder.recurrenceRule,
      status: reminder.status,
      contact_id: reminder.contactId,
      created_at: reminder.createdAt,
    },
    { status: 201 }
  );
}
