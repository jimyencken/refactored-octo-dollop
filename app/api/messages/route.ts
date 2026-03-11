import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const where = status ? { status } : {};
  const messages = await prisma.message.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json(
    messages.map((m) => ({
      id: m.id, contact_id: m.contactId, subject: m.subject, body: m.body,
      channel: m.channel, status: m.status, scheduled_send_at: m.scheduledSendAt,
      created_at: m.createdAt, updated_at: m.updatedAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = await prisma.message.create({
    data: {
      contactId: body.contact_id,
      subject: body.subject || null,
      body: body.body,
      channel: body.channel || "email",
    },
  });
  return NextResponse.json(
    {
      id: message.id, contact_id: message.contactId, subject: message.subject,
      body: message.body, channel: message.channel, status: message.status,
      scheduled_send_at: message.scheduledSendAt,
      created_at: message.createdAt, updated_at: message.updatedAt,
    },
    { status: 201 }
  );
}
