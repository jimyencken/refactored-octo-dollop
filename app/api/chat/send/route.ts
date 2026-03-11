import { processChat } from "@/lib/chat";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await processChat(body.conversation_id || null, body.message);
  return NextResponse.json({
    conversation_id: result.conversationId,
    reply: result.reply,
  });
}
