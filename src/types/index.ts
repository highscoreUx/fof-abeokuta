import type { Permission } from "@/lib/permissions/catalog";

export interface AuthUser {
  id: string;
  permissions: Permission[];
  eventUserRoleId: string;
  eventUserRoleSlug: string;
  eventUserRoleName: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  teamId?: string | null;
  teamLetter?: string | null;
  eventId: string;
  eventSlug: string;
}

export interface AccessTokenPayload {
  userId: string;
  permissions: Permission[];
  eventUserRoleId: string;
  eventUserRoleSlug: string;
  authVersion: number;
  permissionsVersion: number;
  rolePermissionsVersion: number;
  permissionsFingerprint: string;
  teamId?: string | null;
  eventId: string;
  eventSlug: string;
  type: "event";
}

export interface EventUserRoleRecord {
  id: string;
  eventId: string;
  name: string;
  slug: string;
  permissions: Array<Permission | "*">;
  permissionsVersion: number;
  isSystem: boolean;
  isEditable: boolean;
  isDeletable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface QuizStateSnapshot {
  sessionId: string;
  quizId: string;
  state: "LOBBY" | "QUESTION" | "RESULTS" | "FINISHED";
  questionIndex: number;
  currentQuestion?: {
    id: string;
    text: string;
    options: string[];
    timeLimitSec: number;
  } | null;
  questionStartedAt: number | null;
  resultsEndsAt: number | null;
  serverNow: number;
  leaderboard: Array<{
    userId: string;
    username: string;
    teamLetter: string | null;
    totalPoints: number;
    rank: number;
  }>;
}

export interface LeaderboardEntry {
  teamId: string;
  teamLetter: string;
  teamName: string;
  averageScore: number;
  judgeCount: number;
  totalPoints: number;
  rank: number;
}

export interface PlatformEvent {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  date: string;
  status: "DRAFT" | "LIVE" | "ARCHIVED";
}
