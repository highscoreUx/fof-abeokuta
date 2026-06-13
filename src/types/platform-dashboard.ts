export interface PlatformDashboardStats {
  summary: {
    totalEvents: number;
    liveEvents: number;
    draftEvents: number;
    archivedEvents: number;
    totalParticipants: number;
    checkedInParticipants: number;
    checkInRate: number;
    totalAccounts: number;
    globalStaff: number;
    platformRoles: number;
    totalTeams: number;
    totalQuizzes: number;
    totalVotes: number;
    totalMessages: number;
  };
  eventsByStatus: Array<{ status: string; count: number }>;
  registrationTrend: Array<{ date: string; registrations: number }>;
  checkInTrend: Array<{ date: string; checkIns: number }>;
  recentEvents: Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
    date: string;
    updatedAt: string;
    participantCount: number;
    teamCount: number;
    checkedInCount: number;
  }>;
  topEventsByParticipants: Array<{
    id: string;
    slug: string;
    title: string;
    status: string;
    participantCount: number;
    checkedInCount: number;
  }>;
}
