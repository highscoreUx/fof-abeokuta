import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { buildCompetitionLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const type = new URL(request.url).searchParams.get("type") ?? "competition";
  const eventId = ctx.event.id;

  if (type === "quiz") {
    const activeSession = await prisma.quizSession.findFirst({
      where: {
        quiz: { eventId },
        state: { in: ["QUESTION", "RESULTS", "FINISHED"] },
      },
      orderBy: { createdAt: "desc" },
      include: { answers: { include: { user: { include: { team: true, account: true } } } } },
    });

    if (!activeSession) return NextResponse.json({ leaderboard: [] });

    const points = new Map<string, { username: string; teamLetter: string | null; total: number }>();
    for (const answer of activeSession.answers) {
      const existing = points.get(answer.userId) ?? {
        username: answer.user.account.username,
        teamLetter: answer.user.team?.letter ?? null,
        total: 0,
      };
      existing.total += answer.points;
      points.set(answer.userId, existing);
    }

    const leaderboard = [...points.entries()]
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.total - a.total)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return NextResponse.json({ leaderboard });
  }

  const leaderboard = await buildCompetitionLeaderboard(eventId);
  return NextResponse.json({ leaderboard });
}
