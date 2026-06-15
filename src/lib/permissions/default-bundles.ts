import type { Permission, RolePermission } from "@/lib/permissions/catalog";

export const SYSTEM_EVENT_USER_ROLE_SLUGS = [
  "event_admin",
  "coordinator",
  "staff",
  "judge",
  "official_photographer",
  "participant",
] as const;

export type SystemEventUserRoleSlug = (typeof SYSTEM_EVENT_USER_ROLE_SLUGS)[number];

export const LEGACY_ROLE_TO_SLUG: Record<string, SystemEventUserRoleSlug> = {
  ADMIN: "event_admin",
  STAFF: "staff",
  JUDGE: "judge",
  PARTICIPANT: "participant",
};

const COORDINATOR_PERMISSIONS: Permission[] = [
  "dashboard.view",
  "user.list",
  "user.create",
  "user.update",
  "user.import",
  "user.check_in",
  "user.assign_teams",
  "user.password.reset",
  "agenda.list",
  "agenda.create",
  "agenda.update",
  "agenda.delete",
  "agenda.template",
  "quiz.manage",
  "quiz.run",
  "spin.manage",
  "spin.run",
  "tic_tac_toe.manage",
  "tic_tac_toe.run",
  "survey.manage",
  "survey.run",
  "survey.view_results",
  "countdown.manage",
  "countdown.run",
  "hangman.manage",
  "hangman.run",
  "vote.list",
  "vote.create",
  "vote.manage",
  "team.list",
  "team.manage",
  "settings.broadcasting",
  "settings.diagnostics",
  "settings.auto_assign",
  "customize.branding",
  "stage.view",
  "participant.home",
  "participant.activities",
  "participant.chat",
  "participant.staff_chat",
  "participant.quiz",
  "participant.tic_tac_toe",
  "participant.hangman",
  "participant.survey",
  "participant.vote",
  "stage.view",
  "gallery.view",
  "gallery.upload",
  "gallery.media_upload",
  "gallery.manage",
];

const STAFF_PERMISSIONS: Permission[] = [
  "user.list",
  "user.create",
  "user.check_in",
  "user.password.reset",
  "stage.view",
  "participant.home",
  "participant.chat",
  "participant.staff_chat",
];

const JUDGE_PERMISSIONS: Permission[] = ["score.submit", "score.view_all", "stage.view"];

const OFFICIAL_PHOTOGRAPHER_PERMISSIONS: Permission[] = [
  "participant.home",
  "gallery.view",
  "gallery.official_upload",
];

const PARTICIPANT_PERMISSIONS: Permission[] = [
  "participant.home",
  "participant.activities",
  "participant.chat",
  "participant.quiz",
  "participant.tic_tac_toe",
  "participant.hangman",
  "participant.survey",
  "participant.vote",
  "stage.view",
  "gallery.view",
  "gallery.upload",
];

export const DEFAULT_EVENT_USER_ROLE_BUNDLES: Array<{
  slug: SystemEventUserRoleSlug;
  name: string;
  permissions: RolePermission[];
  isSystem: boolean;
}> = [
  {
    slug: "event_admin",
    name: "Event admin",
    permissions: ["*"],
    isSystem: true,
  },
  {
    slug: "coordinator",
    name: "Coordinator",
    permissions: COORDINATOR_PERMISSIONS,
    isSystem: true,
  },
  {
    slug: "staff",
    name: "Staff",
    permissions: STAFF_PERMISSIONS,
    isSystem: true,
  },
  {
    slug: "judge",
    name: "Judge",
    permissions: JUDGE_PERMISSIONS,
    isSystem: true,
  },
  {
    slug: "official_photographer",
    name: "Official photographer",
    permissions: OFFICIAL_PHOTOGRAPHER_PERMISSIONS,
    isSystem: true,
  },
  {
    slug: "participant",
    name: "Participant",
    permissions: PARTICIPANT_PERMISSIONS,
    isSystem: true,
  },
];

export function isNonDeletableRoleSlug(slug: string): boolean {
  return slug === "event_admin" || slug === "participant" || slug === "platform_admin";
}

export function isNonEditableRoleSlug(slug: string): boolean {
  return slug === "platform_admin";
}

export function isSystemRoleSlug(slug: string): boolean {
  return (SYSTEM_EVENT_USER_ROLE_SLUGS as readonly string[]).includes(slug);
}
