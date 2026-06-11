import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { checkDatabaseHealth } from "@/lib/prisma";
import { getClientCount } from "@/server/socket/io";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "settings.diagnostics");
  if (ctx instanceof NextResponse) return ctx;

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
    event: { slug: ctx.event.slug, title: ctx.event.title },
    timestamp: new Date().toISOString(),
  });
}
