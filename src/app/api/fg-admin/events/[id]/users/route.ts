import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { CommunityAudience } from "@/lib/community-audience";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { jsonError } from "@/lib/auth/middleware";
import { parsePaginationParams, toPaginatedResponse } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { createUserSchema } from "@/lib/validators/auth";
import { buildUsersOrderBy, buildUsersWhere } from "@/lib/users-query";
import { createUserFromRow, serializeUserRow, userWithAccountInclude } from "@/lib/users";

function parseAudience(value: string | null): CommunityAudience {
  if (value === "staff") return "staff";
  if (value === "participants") return "participants";
  return "members";
}

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
  const audience = parseAudience(searchParams.get("audience"));
  const where = buildUsersWhere(event.id, { ...query, audience });

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: userWithAccountInclude,
      orderBy: buildUsersOrderBy(query.sortBy, query.sortOrder),
      skip: query.skip,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json(
    toPaginatedResponse(
      users.map((user) => serializeUserRow(user)),
      total,
      query.page,
      query.limit,
    ),
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return jsonError("Event not found", "NOT_FOUND", 404);
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  try {
    const { user, initialPassword, permissionProfile } = await createUserFromRow(
      event.id,
      parsed.data,
    );
    return NextResponse.json(
      {
        user: serializeUserRow(user),
        initialPassword,
        permissionProfile,
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to create user",
      "CREATE_FAILED",
      400,
    );
  }
}
