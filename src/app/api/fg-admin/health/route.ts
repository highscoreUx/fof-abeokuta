import { NextRequest, NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/prisma";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { getClientCount } from "@/server/socket/io";

export async function GET(request: NextRequest) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const db = await checkDatabaseHealth();
  let socketClients = 0;
  try {
    socketClients = getClientCount();
  } catch {
    socketClients = 0;
  }

  return NextResponse.json({
    status: db.ok ? "healthy" : "degraded",
    database: db,
    socket: { clients: socketClients },
    timestamp: new Date().toISOString(),
  });
}
