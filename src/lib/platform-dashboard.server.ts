import "server-only";

import { prisma } from "@/lib/prisma";
import type { PlatformDashboardStats } from "@/types/platform-dashboard";

const TREND_DAYS = 30;

export type { PlatformDashboardStats };

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDayKey(date: Date): string {
  return startOfDay(date).toISOString().slice(0, 10);
}

function buildDaySeries(days: number): string[] {
  const keys: string[] = [];
  const today = startOfDay(new Date());
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.push(formatDayKey(d));
  }
  return keys;
}

function aggregateByDay(
  rows: Array<{ day: Date }>,
  dayKeys: string[],
): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>(dayKeys.map((key) => [key, 0]));
  for (const row of rows) {
    const key = formatDayKey(row.day);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return dayKeys.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

export async function getPlatformDashboardStats(): Promise<PlatformDashboardStats> {
  const trendStart = startOfDay(new Date());
  trendStart.setDate(trendStart.getDate() - (TREND_DAYS - 1));
  const dayKeys = buildDaySeries(TREND_DAYS);

  const [
    totalEvents,
    eventsByStatusRaw,
    totalParticipants,
    checkedInParticipants,
    totalAccounts,
    globalStaff,
    platformRoles,
    totalTeams,
    totalQuizzes,
    totalSpinChallenges,
    totalSurveys,
    totalTttChallenges,
    totalMessages,
    recentEventsRaw,
    topEventsRaw,
    registrationRows,
    checkInRows,
    checkedInByEvent,
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { checkedInAt: { not: null } } }),
    prisma.account.count(),
    prisma.account.count({ where: { globalMember: true } }),
    prisma.platformRole.count(),
    prisma.team.count(),
    prisma.quiz.count(),
    prisma.spinChallenge.count(),
    prisma.survey.count(),
    prisma.ticTacToeChallenge.count(),
    prisma.message.count(),
    prisma.event.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        _count: { select: { users: true, teams: true } },
      },
    }),
    prisma.event.findMany({
      orderBy: { users: { _count: "desc" } },
      take: 6,
      include: {
        _count: { select: { users: true } },
      },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: trendStart } },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      where: { checkedInAt: { not: null, gte: trendStart } },
      select: { checkedInAt: true },
    }),
    prisma.user.groupBy({
      by: ["eventId"],
      where: { checkedInAt: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const checkedInByEventMap = new Map(
    checkedInByEvent.map((row) => [row.eventId, row._count._all]),
  );

  const statusCounts = {
    LIVE: 0,
    DRAFT: 0,
    ARCHIVED: 0,
  };
  for (const row of eventsByStatusRaw) {
    statusCounts[row.status] = row._count._all;
  }

  const registrationAgg = aggregateByDay(
    registrationRows.map((row) => ({ day: row.createdAt })),
    dayKeys,
  );
  const checkInAgg = aggregateByDay(
    checkInRows
      .filter((row) => row.checkedInAt)
      .map((row) => ({ day: row.checkedInAt! })),
    dayKeys,
  );

  const checkInRate =
    totalParticipants > 0 ? Math.round((checkedInParticipants / totalParticipants) * 100) : 0;

  const totalActivities =
    totalQuizzes + totalSpinChallenges + totalSurveys + totalTttChallenges;

  return {
    summary: {
      totalEvents,
      liveEvents: statusCounts.LIVE,
      draftEvents: statusCounts.DRAFT,
      archivedEvents: statusCounts.ARCHIVED,
      totalParticipants,
      checkedInParticipants,
      checkInRate,
      totalAccounts,
      globalStaff,
      platformRoles,
      totalTeams,
      totalActivities,
      totalSurveys,
      totalMessages,
    },
    eventsByStatus: [
      { status: "Live", count: statusCounts.LIVE },
      { status: "Draft", count: statusCounts.DRAFT },
      { status: "Archived", count: statusCounts.ARCHIVED },
    ],
    registrationTrend: registrationAgg.map(({ date, count }) => ({
      date,
      registrations: count,
    })),
    checkInTrend: checkInAgg.map(({ date, count }) => ({
      date,
      checkIns: count,
    })),
    recentEvents: recentEventsRaw.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      status: event.status,
      date: event.date.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      participantCount: event._count.users,
      teamCount: event._count.teams,
      checkedInCount: checkedInByEventMap.get(event.id) ?? 0,
    })),
    topEventsByParticipants: topEventsRaw.map((event) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      status: event.status,
      participantCount: event._count.users,
      checkedInCount: checkedInByEventMap.get(event.id) ?? 0,
    })),
  };
}
