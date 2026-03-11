import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.notification.update({ where: { id: Number(id) }, data: { isRead: true } });
  return NextResponse.json({ ok: true });
}
