import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { jsonError } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(_request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) {
    return jsonError("Event not found", "NOT_FOUND", 404);
  }

  const teams = await prisma.team.findMany({
    where: { eventId: event.id },
    orderBy: { letter: "asc" },
    select: { id: true, letter: true, name: true, color: true },
  });

  return NextResponse.json({ teams });
}
