import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const convs = await prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return NextResponse.json(
      convs.map((c) => ({
        id: c.id, title: c.title, created_at: c.createdAt, updated_at: c.updatedAt,
      }))
    );
  } catch { return NextResponse.json([]); }
}
