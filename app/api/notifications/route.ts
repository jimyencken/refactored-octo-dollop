import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const notifs = await prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json(
    notifs.map((n) => ({
      id: n.id, title: n.title, body: n.body,
      notification_type: n.notificationType,
      is_read: n.isRead, action_url: n.actionUrl, created_at: n.createdAt,
    }))
  );
}
