import { CACHE_TTL, cacheGetOrSet } from "@/lib/cache/index";
import { prisma } from "@/lib/prisma";

export interface CompetitionLeaderboardEntry {
  teamId: string;
  teamLetter: string;
  teamName: string;
  averageScore: number;
  judgeCount: number;
  totalPoints: number;
  rank: number;
}

export async function buildCompetitionLeaderboard(
  eventId: string,
): Promise<CompetitionLeaderboardEntry[]> {
  return cacheGetOrSet(`leaderboard:${eventId}:competition`, CACHE_TTL.leaderboard, async () => {
    const teams = await prisma.team.findMany({ where: { eventId }, orderBy: { letter: "asc" } });
    const scores = await prisma.score.findMany({ where: { team: { eventId } } });

    return teams
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
  });
}
