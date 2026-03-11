import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const msg = await prisma.message.update({
    where: { id: Number(id) },
    data: { status: "sent" },
  });
  return NextResponse.json({
    id: msg.id, contact_id: msg.contactId, subject: msg.subject, body: msg.body,
    channel: msg.channel, status: msg.status, scheduled_send_at: msg.scheduledSendAt,
    created_at: msg.createdAt, updated_at: msg.updatedAt,
  });
}
