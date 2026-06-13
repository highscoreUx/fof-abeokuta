import { NextRequest, NextResponse } from "next/server";
import { listAvailableCommunityParticipants } from "@/lib/community-event-participants";
import { jsonError } from "@/lib/auth/middleware";
import { parsePaginationParams, toPaginatedResponse } from "@/lib/pagination";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) {
    return jsonError("Event not found", "NOT_FOUND", 404);
  }

  const query = parsePaginationParams(new URL(request.url).searchParams);
  const { data, total } = await listAvailableCommunityParticipants(event.id, query);

  return NextResponse.json(toPaginatedResponse(data, total, query.page, query.limit));
}
