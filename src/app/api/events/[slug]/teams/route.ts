import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventRole } from "@/lib/auth/event-middleware";
import { parsePaginationParams, toPaginatedResponse } from "@/lib/pagination";
import { buildTeamsOrderBy, buildTeamsWhere } from "@/lib/teams-query";
import { prisma } from "@/lib/prisma";
import { normalizeTeamCode, validateTeamCode } from "@/lib/team-codes";
import { parseTeamInput, seedFigmaTeams } from "@/lib/teams";

function serializeTeam(team: {
  id: string;
  letter: string;
  name: string;
  color: string;
  _count: { users: number };
}) {
  const { _count, ...rest } = team;
  return { ...rest, memberCount: _count.users };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);

  if (searchParams.has("page")) {
    const query = parsePaginationParams(searchParams);
    const where = buildTeamsWhere(ctx.event.id, query);

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        orderBy: buildTeamsOrderBy(query.sortBy, query.sortOrder),
        skip: query.skip,
        take: query.limit,
        include: { _count: { select: { users: true } } },
      }),
      prisma.team.count({ where }),
    ]);

    return NextResponse.json(
      toPaginatedResponse(teams.map(serializeTeam), total, query.page, query.limit),
    );
  }

  const teams = await prisma.team.findMany({
    where: { eventId: ctx.event.id },
    orderBy: { letter: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({ teams: teams.map(serializeTeam) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventRole(request, slug, "ADMIN");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();

  if (body.action === "seed_figma") {
    const result = await seedFigmaTeams(ctx.event.id);
    return NextResponse.json(result);
  }

  try {
    const { letter, name, color } = parseTeamInput(body);
    const existing = await prisma.team.findUnique({
      where: { eventId_letter: { eventId: ctx.event.id, letter } },
    });
    if (existing) {
      return NextResponse.json({ error: `Team code "${letter}" already exists` }, { status: 409 });
    }

    const team = await prisma.team.create({
      data: { eventId: ctx.event.id, letter, name, color },
      include: { _count: { select: { users: true } } },
    });
    return NextResponse.json({ team: serializeTeam(team) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid team" },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventRole(request, slug, "ADMIN");
  if (ctx instanceof NextResponse) return ctx;

  const body = (await request.json()) as {
    teams?: Array<{ id: string; letter?: string; name?: string; color?: string }>;
  };

  if (!Array.isArray(body.teams) || body.teams.length === 0) {
    return NextResponse.json({ error: "teams array required" }, { status: 400 });
  }

  for (const team of body.teams) {
    if (!team.id) continue;

    const data: { letter?: string; name?: string; color?: string } = {};
    if (team.name !== undefined) data.name = team.name.trim();
    if (team.color !== undefined) data.color = team.color.trim();

    if (team.letter !== undefined) {
      const letter = normalizeTeamCode(team.letter);
      const letterError = validateTeamCode(letter);
      if (letterError) {
        return NextResponse.json({ error: letterError }, { status: 400 });
      }

      const conflict = await prisma.team.findFirst({
        where: {
          eventId: ctx.event.id,
          letter,
          NOT: { id: team.id },
        },
      });
      if (conflict) {
        return NextResponse.json({ error: `Team code "${letter}" already exists` }, { status: 409 });
      }
      data.letter = letter;
    }

    await prisma.team.updateMany({
      where: { id: team.id, eventId: ctx.event.id },
      data,
    });
  }

  const teams = await prisma.team.findMany({
    where: { eventId: ctx.event.id },
    orderBy: { letter: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({ teams: teams.map(serializeTeam) });
}
