import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/prisma";

export async function GET() {
  const database = await checkDatabaseHealth();
  const healthy = database.ok;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      database: {
        ok: database.ok,
        ...(database.latencyMs !== undefined ? { latencyMs: database.latencyMs } : {}),
      },
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
