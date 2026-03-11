import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  return NextResponse.json({ ok: true });
}
