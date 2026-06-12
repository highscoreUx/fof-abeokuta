import type { Permission } from "@/lib/permissions/catalog";
import type { EnabledActivitySnapshot } from "@/lib/activities/catalog";

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
  enabledActivities?: EnabledActivitySnapshot[];
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
  enabledActivities: EnabledActivitySnapshot[];
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

export interface QuizLeaderboardEntry {
  userId: string;
  username: string;
  teamLetter: string | null;
  totalPoints: number;
  rank: number;
  streak: number;
  questionsAnswered: number;
  correctCount: number;
  accuracy: number;
}

export type TriviaQuestionType =
  | "QUIZ"
  | "QUIZ_IMAGE"
  | "TRUE_FALSE"
  | "TYPE_ANSWER"
  | "PUZZLE"
  | "PUZZLE_IMAGE"
  | "SLIDER"
  | "PIN_ANSWER"
  | "QUIZ_AUDIO";

export interface TriviaQuestionConfig {
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  items?: string[];
  correctOrder?: number[];
  min?: number;
  max?: number;
  correct?: number;
  tolerance?: number;
  pins?: Array<{ x: number; y: number }>;
  pinTolerance?: number;
}

export interface TriviaAnswerPayload {
  answerIndex?: number;
  text?: string;
  order?: number[];
  value?: number;
  pins?: Array<{ x: number; y: number }>;
}

export interface QuizQuestionResults {
  correctIndex?: number | null;
  correctValue?: number | null;
  correctOrder?: number[] | null;
  optionCounts: number[];
  topScorers: Array<{
    userId: string;
    username: string;
    teamLetter: string | null;
    points: number;
    responseTimeMs: number;
    isCorrect: boolean;
  }>;
}

export interface QuizStateSnapshot {
  sessionId: string;
  quizId: string;
  quizTitle?: string;
  state: "LOBBY" | "QUESTION" | "RESULTS" | "FINISHED";
  questionIndex: number;
  totalQuestions: number;
  currentQuestion?: {
    id: string;
    type: TriviaQuestionType;
    text: string;
    options: string[];
    config: TriviaQuestionConfig;
    mediaUrl?: string | null;
    timeLimitSec: number;
  } | null;
  correctIndex?: number | null;
  questionResults?: QuizQuestionResults | null;
  questionStartedAt: number | null;
  resultsEndsAt: number | null;
  serverNow: number;
  answeredCount?: number;
  leaderboard: QuizLeaderboardEntry[];
}

export interface QuizAnswerResult {
  sessionId: string;
  questionId: string;
  answerIndex?: number;
  answerValue?: TriviaAnswerPayload;
  isCorrect: boolean;
  points: number;
  speedPoints: number;
  streakMultiplier: number;
  streak: number;
  responseTimeMs: number;
  totalPoints: number;
  accuracy: number;
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
