import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conv = await prisma.conversation.findUniqueOrThrow({
    where: { id: Number(id) },
    include: { turns: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({
    id: conv.id,
    title: conv.title,
    created_at: conv.createdAt,
    turns: conv.turns.map((t) => ({
      id: t.id, role: t.role, content: t.content, created_at: t.createdAt,
    })),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.conversation.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
