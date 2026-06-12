import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { jsonError } from "@/lib/auth/middleware";
import { parsePaginationParams, toPaginatedResponse } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { buildUsersOrderBy, buildUsersWhere } from "@/lib/users-query";
import { serializePlatformEventUser } from "@/lib/users";

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

  const { searchParams } = new URL(request.url);
  const query = parsePaginationParams(searchParams);
  const where = buildUsersWhere(event.id, { ...query, role: "event_admin" });

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { team: true, eventUserRole: true },
      orderBy: buildUsersOrderBy(query.sortBy, query.sortOrder),
      skip: query.skip,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json(
    toPaginatedResponse(
      users.map(serializePlatformEventUser),
      total,
      query.page,
      query.limit,
    ),
  );
}
