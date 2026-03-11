import { NextResponse } from "next/server";

export async function withDb<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<NextResponse> {
  try {
    const result = await fn();
    return NextResponse.json(result);
  } catch (e) {
    console.error("DB error:", (e as Error).message);
    if (fallback !== undefined) {
      return NextResponse.json(fallback);
    }
    return NextResponse.json(
      { error: "Database unavailable. Add a hosted database (e.g. Vercel Postgres) for persistence." },
      { status: 503 }
    );
  }
}
