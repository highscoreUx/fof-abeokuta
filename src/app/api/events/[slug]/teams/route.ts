import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventRole } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const teams = await prisma.team.findMany({
    where: { eventId: ctx.event.id },
    orderBy: { letter: "asc" },
  });

  return NextResponse.json({ teams });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventRole(request, slug, "ADMIN");
  if (ctx instanceof NextResponse) return ctx;

  const body = (await request.json()) as {
    teams?: Array<{ id: string; name?: string; color?: string }>;
  };

  if (!Array.isArray(body.teams) || body.teams.length === 0) {
    return NextResponse.json({ error: "teams array required" }, { status: 400 });
  }

  for (const team of body.teams) {
    if (!team.id) continue;
    await prisma.team.updateMany({
      where: { id: team.id, eventId: ctx.event.id },
      data: {
        ...(team.name !== undefined ? { name: team.name } : {}),
        ...(team.color !== undefined ? { color: team.color } : {}),
      },
    });
  }

  const teams = await prisma.team.findMany({
    where: { eventId: ctx.event.id },
    orderBy: { letter: "asc" },
  });

  return NextResponse.json({ teams });
}
