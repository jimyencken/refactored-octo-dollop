import { NextResponse } from "next/server";
import { seedIfEmpty } from "./prisma";

let seeded = false;

export async function withDb<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<NextResponse> {
  try {
    // Auto-seed on first API request
    if (!seeded) {
      seeded = true;
      await seedIfEmpty();
    }

    const result = await fn();
    return NextResponse.json(result);
  } catch (e) {
    console.error("DB error:", (e as Error).message);
    if (fallback !== undefined) {
      return NextResponse.json(fallback);
    }
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }
}
