import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { parsePaginationParams, toPaginatedResponse } from "@/lib/pagination";
import { createUserSchema } from "@/lib/validators/auth";
import { buildUsersOrderBy, buildUsersWhere } from "@/lib/users-query";
import { createUserFromRow, serializeUserRow } from "@/lib/users";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "user.list");
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const query = parsePaginationParams(searchParams);
  const where = buildUsersWhere(ctx.event.id, query);

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
      users.map((user) => serializeUserRow(user, ctx.auth.permissions)),
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
  const ctx = await requireEventPermission(request, slug, "user.create");
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
        user: serializeUserRow({ ...user, team: user.team }, ctx.auth.permissions),
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
