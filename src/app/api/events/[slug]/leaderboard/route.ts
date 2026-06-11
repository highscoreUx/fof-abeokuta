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

  const type = new URL(request.url).searchParams.get("type") ?? "competition";
  const eventId = ctx.event.id;

  if (type === "quiz") {
    const activeSession = await prisma.quizSession.findFirst({
      where: {
        quiz: { eventId },
        state: { in: ["QUESTION", "RESULTS", "FINISHED"] },
      },
      orderBy: { createdAt: "desc" },
      include: { answers: { include: { user: { include: { team: true } } } } },
    });

    if (!activeSession) return NextResponse.json({ leaderboard: [] });

    const points = new Map<string, { username: string; teamLetter: string | null; total: number }>();
    for (const answer of activeSession.answers) {
      const existing = points.get(answer.userId) ?? {
        username: answer.user.username,
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

  const teams = await prisma.team.findMany({ where: { eventId }, orderBy: { letter: "asc" } });
  const scores = await prisma.score.findMany({ where: { team: { eventId } } });

  const leaderboard = teams
    .map((team) => {
      const teamScores = scores.filter((s) => s.teamId === team.id);
      const judgeIds = new Set(teamScores.map((s) => s.judgeId));
      const totalPoints = teamScores.reduce((sum, s) => sum + s.points, 0);
      const averageScore = judgeIds.size > 0 ? totalPoints / judgeIds.size : 0;
      return {
        teamId: team.id,
        teamLetter: team.letter,
        teamName: team.name,
        averageScore: Math.round(averageScore * 100) / 100,
        judgeCount: judgeIds.size,
        totalPoints,
        rank: 0,
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return NextResponse.json({ leaderboard });
}
