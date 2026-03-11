import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const count = await prisma.notification.count({ where: { isRead: false } });
  return NextResponse.json({ count });
}
