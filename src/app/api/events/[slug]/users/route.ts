import { NextRequest, NextResponse } from "next/server";
import { requireEventRole } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { canViewPassword } from "@/lib/permissions";
import { parsePaginationParams, toPaginatedResponse } from "@/lib/pagination";
import { createUserSchema } from "@/lib/validators/auth";
import { buildUsersOrderBy, buildUsersWhere } from "@/lib/users-query";
import { createUserFromRow } from "@/lib/users";
import type { Role } from "@/types";

function serializeUserRow(
  user: {
    id: string;
    role: Role;
    firstName: string;
    lastName: string;
    username: string;
    teamId: string | null;
    checkedInAt: Date | null;
    createdAt: Date;
    loginPhrase: string | null;
    pinDisplay: string | null;
    team: { letter: string } | null;
  },
  viewerRole: Role,
) {
  return {
    id: user.id,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    teamId: user.teamId,
    teamLetter: user.team?.letter ?? null,
    checkedInAt: user.checkedInAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    loginPhrase: user.loginPhrase,
    password: canViewPassword(viewerRole, user.role, user.pinDisplay) ? user.pinDisplay : undefined,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventRole(request, slug, "STAFF");
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const query = parsePaginationParams(searchParams);
  const where = buildUsersWhere(ctx.event.id, query);

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { team: true },
      orderBy: buildUsersOrderBy(query.sortBy, query.sortOrder),
      skip: query.skip,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json(
    toPaginatedResponse(
      users.map((user) => serializeUserRow(user, ctx.auth.role)),
      total,
      query.page,
      query.limit,
    ),
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventRole(request, slug, "ADMIN");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const user = await createUserFromRow(ctx.event.id, parsed.data);
    return NextResponse.json(
      {
        user: serializeUserRow(
          { ...user, team: user.team },
          ctx.auth.role,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 400 },
    );
  }
}
