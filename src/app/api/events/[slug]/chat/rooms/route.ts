import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const rooms: Array<{
    id: string;
    type: "global" | "team";
    label: string;
    letter?: string;
    name?: string;
  }> = [{ id: "global", type: "global", label: "Global" }];

  if (ctx.auth.teamId) {
    const team = await prisma.team.findFirst({
      where: { id: ctx.auth.teamId, eventId: ctx.event.id },
      select: { id: true, letter: true, name: true },
    });
    if (team) {
      rooms.push({
        id: team.id,
        type: "team",
        label: `Team ${team.letter}`,
        letter: team.letter,
        name: team.name,
      });
    }
  }

  return NextResponse.json({ rooms });
}
