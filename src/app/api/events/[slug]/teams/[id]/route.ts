import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { guardTeamingEnabled } from "@/lib/team-settings";
import { deleteTeam } from "@/lib/teams";
import { BRAND_PRIMARY } from "@/lib/brand";
import { prisma } from "@/lib/prisma";
import { normalizeTeamCode, validateTeamCode } from "@/lib/team-codes";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "team.manage");
  if (ctx instanceof NextResponse) return ctx;

  const teamingGuard = await guardTeamingEnabled(ctx.event.id);
  if (teamingGuard) return teamingGuard;

  const body = (await request.json()) as {
    letter?: string;
    name?: string;
    color?: string;
  };

  const data: { letter?: string; name?: string; color?: string } = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    data.name = name;
  }
  if (body.color !== undefined) data.color = body.color.trim() || BRAND_PRIMARY;

  if (body.letter !== undefined) {
    const letter = normalizeTeamCode(body.letter);
    const letterError = validateTeamCode(letter);
    if (letterError) return NextResponse.json({ error: letterError }, { status: 400 });

    const conflict = await prisma.team.findFirst({
      where: {
        eventId: ctx.event.id,
        letter,
        NOT: { id },
      },
    });
    if (conflict) {
      return NextResponse.json({ error: `Team code "${letter}" already exists` }, { status: 409 });
    }
    data.letter = letter;
  }

  const updated = await prisma.team.updateMany({
    where: { id, eventId: ctx.event.id },
    data,
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const team = await prisma.team.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({ team: team ? serializeTeam(team) : null });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "team.manage");
  if (ctx instanceof NextResponse) return ctx;

  const teamingGuard = await guardTeamingEnabled(ctx.event.id);
  if (teamingGuard) return teamingGuard;

  try {
    await deleteTeam(ctx.event.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete team" },
      { status: 400 },
    );
  }
}
