import type { Permission, RolePermission } from "@/lib/permissions/catalog";

export const SYSTEM_EVENT_USER_ROLE_SLUGS = [
  "event_admin",
  "coordinator",
  "staff",
  "judge",
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
  "user.password.view",
  "agenda.list",
  "agenda.create",
  "agenda.update",
  "agenda.delete",
  "agenda.template",
  "quiz.manage",
  "quiz.run",
  "spin.manage",
  "spin.run",
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
  "participant.quiz",
  "participant.vote",
];

const STAFF_PERMISSIONS: Permission[] = [
  "user.list",
  "user.check_in",
  "user.password.view",
  "stage.view",
];

const JUDGE_PERMISSIONS: Permission[] = ["score.submit", "score.view_all", "stage.view"];

const PARTICIPANT_PERMISSIONS: Permission[] = [
  "participant.home",
  "participant.activities",
  "participant.chat",
  "participant.quiz",
  "participant.vote",
  "stage.view",
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
    slug: "participant",
    name: "Participant",
    permissions: PARTICIPANT_PERMISSIONS,
    isSystem: true,
  },
];

export function isNonDeletableRoleSlug(slug: string): boolean {
  return slug === "event_admin";
}

export function isNonEditableRoleSlug(slug: string): boolean {
  return slug === "event_admin";
}

export function isSystemRoleSlug(slug: string): boolean {
  return (SYSTEM_EVENT_USER_ROLE_SLUGS as readonly string[]).includes(slug);
}
