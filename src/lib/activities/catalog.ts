import type { Permission } from "@/lib/permissions/catalog";

export const ACTIVITY_KAHOOT = "kahoot" as const;
export const ACTIVITY_SPINNER = "spinner" as const;
/** @deprecated use ACTIVITY_SPINNER */
export const ACTIVITY_SPIN_TO_BUILD = ACTIVITY_SPINNER;
export const ACTIVITY_SURVEY = "survey" as const;
export const ACTIVITY_TIC_TAC_TOE = "tic_tac_toe" as const;

export type ActivitySlug =
  | typeof ACTIVITY_KAHOOT
  | typeof ACTIVITY_SPINNER
  | typeof ACTIVITY_SURVEY
  | typeof ACTIVITY_TIC_TAC_TOE;

/** Activity types shown on the event admin activities index. */
export const CONFIGURABLE_ACTIVITY_SLUGS = [
  ACTIVITY_KAHOOT,
  ACTIVITY_SPINNER,
  ACTIVITY_SURVEY,
  ACTIVITY_TIC_TAC_TOE,
  "spin_to_build",
] as const;

export interface ActivityTypeDefinition {
  slug: ActivitySlug;
  name: string;
  description: string;
  managePermission: Permission;
  runPermission: Permission;
  participantPermission: Permission;
  sortOrder: number;
}

export const ACTIVITY_CATALOG: ActivityTypeDefinition[] = [
  {
    slug: ACTIVITY_KAHOOT,
    name: "Live Trivia",
    description: "Real-time Kahoot-style activity with questions and a live leaderboard.",
    managePermission: "quiz.manage",
    runPermission: "quiz.run",
    participantPermission: "participant.quiz",
    sortOrder: 1,
  },
  {
    slug: ACTIVITY_SPINNER,
    name: "Spinner",
    description: "Spin a wheel to pick a random option. Teammates can spectate live spins.",
    managePermission: "spin.manage",
    runPermission: "spin.run",
    participantPermission: "participant.activities",
    sortOrder: 2,
  },
  {
    slug: ACTIVITY_SURVEY,
    name: "Survey",
    description: "Collect opinions and feedback with polls, scales, word clouds, and more.",
    managePermission: "survey.manage",
    runPermission: "survey.run",
    participantPermission: "participant.survey",
    sortOrder: 3,
  },
  {
    slug: ACTIVITY_TIC_TAC_TOE,
    name: "Team Tic-Tac-Toe",
    description: "Teams compete on a 3×3 grid — champion or council mode with live spectating.",
    managePermission: "tic_tac_toe.manage",
    runPermission: "tic_tac_toe.run",
    participantPermission: "participant.tic_tac_toe",
    sortOrder: 4,
  },
];

export function getActivityDefinition(slug: string): ActivityTypeDefinition | undefined {
  return ACTIVITY_CATALOG.find((entry) => entry.slug === slug);
}

export interface EnabledActivitySnapshot {
  slug: ActivitySlug;
  allowGeneral: boolean;
  allowGroup: boolean;
  allowStaff: boolean;
}

/** Per-instance participant scope. Group = team-scoped (each team participates separately). */
export interface ActivityInstanceScope {
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
}

export function validateInstanceScopeAgainstEvent(
  eventActivity: { allowGeneral: boolean; allowGroup: boolean },
  scope: ActivityInstanceScope,
  options?: { teamingEnabled?: boolean },
): string | null {
  const teamingEnabled = options?.teamingEnabled ?? true;

  if (!scope.allowGeneralParticipants && !scope.allowGroupParticipants) {
    return "Select at least one participant scope for this activity instance.";
  }
  if (!teamingEnabled && scope.allowGroupParticipants) {
    return "Team scope is not available because teaming is disabled for this event.";
  }
  if (scope.allowGeneralParticipants && !eventActivity.allowGeneral) {
    return "Whole event scope is not allowed for this activity on this event.";
  }
  if (scope.allowGroupParticipants && !eventActivity.allowGroup) {
    return "Team scope is not allowed for this activity on this event.";
  }
  return null;
}

export function userCanAccessActivityInstance(
  user: { teamId?: string | null },
  scope: ActivityInstanceScope,
): boolean {
  if (scope.allowGeneralParticipants) return true;
  if (scope.allowGroupParticipants) return Boolean(user.teamId);
  return false;
}

export function formatInstanceScope(scope: ActivityInstanceScope): string {
  const parts: string[] = [];
  if (scope.allowGeneralParticipants) parts.push("Whole event");
  if (scope.allowGroupParticipants) parts.push("Team scoped");
  return parts.join(" · ") || "No scope";
}

export const ACTIVITIES_ADMIN_PERMISSIONS: Permission[] = [
  "quiz.manage",
  "spin.manage",
  "tic_tac_toe.manage",
  "survey.manage",
  "quiz.run",
  "spin.run",
  "tic_tac_toe.run",
  "survey.run",
];
