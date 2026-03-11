import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: body.contact_id } });

  const toneMap: Record<string, string> = {
    professional: "Dear",
    casual: "Hey",
    formal: "Dear Mr./Ms.",
  };
  const greeting = toneMap[body.tone] || "Hello";

  let msgBody = `${greeting} ${contact.name},\n\nRe: ${body.context}\n\nI wanted to reach out regarding ${body.context}. `;

  if (contact.relationshipType === "business") {
    msgBody += "I look forward to discussing this further at your earliest convenience.";
  } else if (contact.relationshipType === "personal") {
    msgBody += "Let me know when you're free to catch up!";
  } else {
    msgBody += "Please let me know your thoughts.";
  }
  msgBody += "\n\nBest regards";

  const message = await prisma.message.create({
    data: {
      contactId: contact.id,
      subject: `Re: ${body.context.slice(0, 80)}`,
      body: msgBody,
      channel: body.channel || "email",
      status: "draft",
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
