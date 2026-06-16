export {
  ACTIVITIES_ADMIN_PERMISSIONS,
  ACTIVITIES_MANIFEST,
  ACTIVITY_CATALOG,
  ACTIVITY_COUNTDOWN,
  ACTIVITY_HANGMAN,
  ACTIVITY_KAHOOT,
  ACTIVITY_MANIFEST_ENTRIES,
  ACTIVITY_SPINNER,
  ACTIVITY_SPIN_TO_BUILD,
  ACTIVITY_SURVEY,
  ACTIVITY_TIC_TAC_TOE,
  CONFIGURABLE_ACTIVITY_SLUGS,
  defaultEventActivityConfig,
  getActivityDefinition,
  isGeneralOnlyActivity,
  slugCandidates,
  resolveActivitySlug,
  type ActivityChannel,
  type ActivityCreateFormScopeMode,
  type ActivityManifestEntry,
  type ActivitySlug,
  type ActivityTypeDefinition,
} from "@/lib/activities/manifest";

export interface EnabledActivitySnapshot {
  slug: import("@/lib/activities/manifest").ActivitySlug;
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
