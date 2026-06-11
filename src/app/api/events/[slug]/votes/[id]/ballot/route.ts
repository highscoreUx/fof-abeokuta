import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: voteId } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const vote = await prisma.vote.findFirst({ where: { id: voteId, eventId: ctx.event.id } });
  if (!vote || !vote.open) return jsonError("Vote is not open", "VOTE_CLOSED", 400);

  const ballot = await prisma.voteBallot.create({
    data: {
      voteId,
      userId: ctx.auth.userId,
      teamId: ctx.auth.teamId,
      selections: body.selections ?? [],
    },
  });

  return NextResponse.json({ ballot });
}
