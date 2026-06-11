import type { Permission } from "@/lib/permissions/catalog";

export const ACTIVITY_KAHOOT = "kahoot" as const;
export const ACTIVITY_SPIN_TO_BUILD = "spin_to_build" as const;

export type ActivitySlug = typeof ACTIVITY_KAHOOT | typeof ACTIVITY_SPIN_TO_BUILD;

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
    slug: ACTIVITY_SPIN_TO_BUILD,
    name: "Spin to Build",
    description: "Random design prompt challenge with team submissions.",
    managePermission: "spin.manage",
    runPermission: "spin.run",
    participantPermission: "participant.activities",
    sortOrder: 2,
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
): string | null {
  if (!scope.allowGeneralParticipants && !scope.allowGroupParticipants) {
    return "Select at least one participant scope for this activity instance.";
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
