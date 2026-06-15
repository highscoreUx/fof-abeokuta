import "server-only";

import {
  ACTIVITY_KAHOOT,
  ACTIVITY_SPINNER,
  ACTIVITY_SURVEY,
  ACTIVITY_TIC_TAC_TOE,
  ACTIVITY_COUNTDOWN,
  ACTIVITY_HANGMAN,
  ACTIVITIES_ADMIN_PERMISSIONS,
  CONFIGURABLE_ACTIVITY_SLUGS,
  userCanAccessActivityInstance,
} from "@/lib/activities/catalog";
import {
  isActivityEnabledForEvent,
  loadEventActivities,
} from "@/lib/activities/event-activities";
import { isTeamingEnabled } from "@/lib/team-settings";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions/catalog";
import { prisma } from "@/lib/prisma";
import { mapActiveSpinnerSessionsByChallengeId } from "@/server/games/spinnerEngine";
import { mapActiveCountdownSessionsByChallengeId } from "@/server/games/countdownEngine";
import { parseHangmanWords } from "@/lib/hangman/types";
import { getBracketForChallenge } from "@/server/games/activityBracketEngine";
import type {
  ActivityInstancesPayload,
  ActivityListItem,
  EventActivityConfigRow,
} from "@/types/activities";

export type { ActivityInstancesPayload, EventActivityConfigRow };

function spinOptionsCount(config: unknown): number {
  const raw = config as { options?: unknown } | null;
  if (!Array.isArray(raw?.options)) return 0;
  return raw.options.map((o) => String(o).trim()).filter(Boolean).length;
}

function anyConfigurableEnabled(activities: EventActivityConfigRow[]): boolean {
  return activities.some(
    (activity) =>
      activity.enabled &&
      CONFIGURABLE_ACTIVITY_SLUGS.includes(
        activity.slug as (typeof CONFIGURABLE_ACTIVITY_SLUGS)[number],
      ),
  );
}

export async function loadActivityInstancesForAdmin(
  eventId: string,
  auth: { permissions: Permission[]; teamId: string | null },
): Promise<ActivityInstancesPayload> {
  const [rows, teamingEnabled] = await Promise.all([
    loadEventActivities(eventId),
    isTeamingEnabled(eventId),
  ]);
  const activities: EventActivityConfigRow[] = rows.map((row) => ({
    slug: row.activityType.slug,
    name: row.activityType.name,
    enabled: row.enabled,
    allowGeneral: row.allowGeneral,
    allowGroup: teamingEnabled ? row.allowGroup : false,
  }));

  const { permissions, teamId } = auth;
  const canKahoot =
    hasPermission(permissions, "quiz.manage") || hasPermission(permissions, "quiz.run");
  const canSpin =
    hasPermission(permissions, "spin.manage") || hasPermission(permissions, "spin.run");
  const canSurvey =
    hasPermission(permissions, "survey.manage") || hasPermission(permissions, "survey.run");
  const canTtt =
    hasPermission(permissions, "tic_tac_toe.manage") ||
    hasPermission(permissions, "tic_tac_toe.run");
  const canCountdown =
    hasPermission(permissions, "countdown.manage") ||
    hasPermission(permissions, "countdown.run");
  const canHangman =
    hasPermission(permissions, "hangman.manage") ||
    hasPermission(permissions, "hangman.run");

  const [kahootEnabled, spinEnabled, surveyEnabled, tttEnabled, countdownEnabled, hangmanEnabled] =
    await Promise.all([
    isActivityEnabledForEvent(eventId, ACTIVITY_KAHOOT),
    isActivityEnabledForEvent(eventId, ACTIVITY_SPINNER),
    isActivityEnabledForEvent(eventId, ACTIVITY_SURVEY),
    isActivityEnabledForEvent(eventId, ACTIVITY_TIC_TAC_TOE),
    isActivityEnabledForEvent(eventId, ACTIVITY_COUNTDOWN),
    isActivityEnabledForEvent(eventId, ACTIVITY_HANGMAN),
  ]);

  const [quizzes, spinChallenges, surveys, tttChallenges, countdownChallenges, hangmanChallenges] =
    await Promise.all([
    canKahoot && kahootEnabled
      ? prisma.quiz.findMany({
          where: { eventId },
          select: {
            id: true,
            title: true,
            allowGeneralParticipants: true,
            allowGroupParticipants: true,
            _count: { select: { questions: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    canSpin && spinEnabled
      ? prisma.spinChallenge.findMany({
          where: { eventId },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    canSurvey && surveyEnabled
      ? prisma.survey.findMany({
          where: { eventId },
          select: {
            id: true,
            title: true,
            status: true,
            allowGeneralParticipants: true,
            allowGroupParticipants: true,
            opensAt: true,
            closesAt: true,
            allowEditsUntilClose: true,
            _count: { select: { questions: true, responses: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    canTtt && tttEnabled
      ? prisma.ticTacToeChallenge.findMany({
          where: { eventId },
          include: {
            matches: {
              where: { state: { in: ["WAITING", "ACTIVE"] } },
              select: { id: true, state: true },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    canCountdown && countdownEnabled
      ? prisma.countdownChallenge.findMany({
          where: { eventId },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    canHangman && hangmanEnabled
      ? prisma.hangmanChallenge.findMany({
          where: { eventId },
          include: {
            matches: {
              where: { state: { in: ["WAITING", "ACTIVE"] } },
              select: { id: true, state: true },
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const activeSpinSessions =
    spinChallenges.length > 0
      ? await mapActiveSpinnerSessionsByChallengeId(spinChallenges.map((c) => c.id))
      : new Map<string, string>();

  const activeCountdownSessions =
    countdownChallenges.length > 0
      ? await mapActiveCountdownSessionsByChallengeId(countdownChallenges.map((c) => c.id))
      : new Map<string, { id: string; state: "RUNNING" | "PAUSED" | "FINISHED" }>();

  const isKahootManager = hasPermission(permissions, "quiz.manage");
  const isSurveyManager =
    hasPermission(permissions, "survey.manage") || hasPermission(permissions, "survey.run");

  const isTeamOnlyInstance = (scope: {
    allowGeneralParticipants: boolean;
    allowGroupParticipants: boolean;
  }) => scope.allowGroupParticipants && !scope.allowGeneralParticipants;

  const instances: ActivityListItem[] = [];

  if (canKahoot && kahootEnabled) {
    const visible = isKahootManager
      ? quizzes
      : quizzes.filter((quiz) =>
          userCanAccessActivityInstance(
            { teamId },
            {
              allowGeneralParticipants: quiz.allowGeneralParticipants,
              allowGroupParticipants: quiz.allowGroupParticipants,
            },
          ),
        );

    for (const quiz of visible) {
      if (!teamingEnabled && isTeamOnlyInstance(quiz)) continue;
      instances.push({
        kind: "kahoot",
        id: quiz.id,
        title: quiz.title,
        allowGeneralParticipants: quiz.allowGeneralParticipants,
        allowGroupParticipants: teamingEnabled ? quiz.allowGroupParticipants : false,
        questionCount: quiz._count.questions,
      });
    }
  }

  if (canSpin && spinEnabled) {
    for (const challenge of spinChallenges) {
      if (!teamingEnabled && isTeamOnlyInstance(challenge)) continue;
      instances.push({
        kind: "spinner",
        id: challenge.id,
        title: challenge.title,
        allowGeneralParticipants: challenge.allowGeneralParticipants,
        allowGroupParticipants: teamingEnabled ? challenge.allowGroupParticipants : false,
        participationMode: challenge.participationMode,
        optionsCount: spinOptionsCount(challenge.config),
        activeSessionId: activeSpinSessions.get(challenge.id) ?? null,
      });
    }
  }

  if (canTtt && tttEnabled) {
    for (const challenge of tttChallenges) {
      if (!teamingEnabled && isTeamOnlyInstance(challenge)) continue;
      const bracket = await getBracketForChallenge("tic_tac_toe", challenge.id);
      instances.push({
        kind: "tic_tac_toe",
        id: challenge.id,
        title: challenge.title,
        mode: challenge.mode,
        competitionFormat: challenge.competitionFormat,
        targetWins: challenge.targetWins,
        bracketState: bracket?.state ?? null,
        allowGeneralParticipants: challenge.allowGeneralParticipants,
        allowGroupParticipants: teamingEnabled ? challenge.allowGroupParticipants : false,
        activeMatchId: challenge.matches[0]?.id ?? null,
        activeMatchState: challenge.matches[0]?.state ?? null,
      });
    }
  }

  if (canSurvey && surveyEnabled) {
    const visible = isSurveyManager
      ? surveys
      : surveys.filter((survey) =>
          userCanAccessActivityInstance(
            { teamId },
            {
              allowGeneralParticipants: survey.allowGeneralParticipants,
              allowGroupParticipants: survey.allowGroupParticipants,
            },
          ),
        );

    for (const survey of visible) {
      if (!teamingEnabled && isTeamOnlyInstance(survey)) continue;
      instances.push({
        kind: "survey",
        id: survey.id,
        title: survey.title,
        status: survey.status,
        allowGeneralParticipants: survey.allowGeneralParticipants,
        allowGroupParticipants: teamingEnabled ? survey.allowGroupParticipants : false,
        opensAt: survey.opensAt?.toISOString() ?? null,
        closesAt: survey.closesAt?.toISOString() ?? null,
        allowEditsUntilClose: survey.allowEditsUntilClose,
        questionCount: survey._count.questions,
        responseCount: survey._count.responses,
      });
    }
  }

  if (canCountdown && countdownEnabled) {
    for (const challenge of countdownChallenges) {
      if (!teamingEnabled && isTeamOnlyInstance(challenge)) continue;
      const active = activeCountdownSessions.get(challenge.id);
      instances.push({
        kind: "countdown",
        id: challenge.id,
        title: challenge.title,
        durationSec: challenge.durationSec,
        allowGeneralParticipants: challenge.allowGeneralParticipants,
        allowGroupParticipants: teamingEnabled ? challenge.allowGroupParticipants : false,
        activeSessionId: active?.id ?? null,
        activeSessionState: active?.state ?? null,
      });
    }
  }

  if (canHangman && hangmanEnabled) {
    for (const challenge of hangmanChallenges) {
      if (!teamingEnabled && isTeamOnlyInstance(challenge)) continue;
      const bracket = await getBracketForChallenge("hangman", challenge.id);
      instances.push({
        kind: "hangman",
        id: challenge.id,
        title: challenge.title,
        mode: challenge.mode,
        competitionFormat: challenge.competitionFormat,
        targetWins: challenge.targetWins,
        bracketState: bracket?.state ?? null,
        allowGeneralParticipants: challenge.allowGeneralParticipants,
        allowGroupParticipants: teamingEnabled ? challenge.allowGroupParticipants : false,
        wordCount: parseHangmanWords(challenge.config).length,
        activeMatchId: challenge.matches[0]?.id ?? null,
        activeMatchState: challenge.matches[0]?.state ?? null,
      });
    }
  }

  return {
    activities,
    instances,
    anyEnabled: anyConfigurableEnabled(activities),
  };
}

export { ACTIVITIES_ADMIN_PERMISSIONS };

export function canAccessActivitiesAdmin(permissions: Permission[]): boolean {
  return hasAnyPermission(permissions, ACTIVITIES_ADMIN_PERMISSIONS);
}
