export type Permission =
  | "dashboard.view"
  | "user.list"
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.import"
  | "user.check_in"
  | "user.assign_teams"
  | "user.password.view"
  | "event_user_role.list"
  | "event_user_role.create"
  | "event_user_role.update"
  | "event_user_role.delete"
  | "agenda.list"
  | "agenda.create"
  | "agenda.update"
  | "agenda.delete"
  | "agenda.template"
  | "quiz.manage"
  | "quiz.run"
  | "spin.manage"
  | "spin.run"
  | "vote.list"
  | "vote.create"
  | "vote.manage"
  | "team.list"
  | "team.manage"
  | "settings.broadcasting"
  | "settings.diagnostics"
  | "settings.auto_assign"
  | "customize.branding"
  | "score.submit"
  | "score.view_all"
  | "participant.home"
  | "participant.activities"
  | "participant.chat"
  | "participant.staff_chat"
  | "participant.quiz"
  | "participant.vote"
  | "stage.view";

export type RolePermission = Permission | "*";

export interface PermissionEntry {
  permission: Permission;
  label: string;
  description?: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  permissions: PermissionEntry[];
}

/** Bump when catalogue changes to invalidate sessions. */
export const PERMISSIONS_CATALOG_REVISION = 1;

export const ALL_PERMISSIONS: readonly Permission[] = [
  "dashboard.view",
  "user.list",
  "user.create",
  "user.update",
  "user.delete",
  "user.import",
  "user.check_in",
  "user.assign_teams",
  "user.password.view",
  "event_user_role.list",
  "event_user_role.create",
  "event_user_role.update",
  "event_user_role.delete",
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
  "score.submit",
  "score.view_all",
  "participant.home",
  "participant.activities",
  "participant.chat",
  "participant.staff_chat",
  "participant.quiz",
  "participant.vote",
  "stage.view",
] as const;

export const PERMISSION_CATALOG: PermissionGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    permissions: [{ permission: "dashboard.view", label: "View admin dashboard" }],
  },
  {
    id: "users",
    label: "Users",
    permissions: [
      { permission: "user.list", label: "List users" },
      { permission: "user.create", label: "Create users" },
      { permission: "user.update", label: "Update users" },
      { permission: "user.delete", label: "Delete users" },
      { permission: "user.import", label: "Import users" },
      { permission: "user.check_in", label: "Check in users" },
      { permission: "user.assign_teams", label: "Assign teams" },
      { permission: "user.password.view", label: "View passwords" },
    ],
  },
  {
    id: "access",
    label: "Access profiles",
    permissions: [
      { permission: "event_user_role.list", label: "List access profiles" },
      { permission: "event_user_role.create", label: "Create access profiles" },
      { permission: "event_user_role.update", label: "Update access profiles" },
      { permission: "event_user_role.delete", label: "Delete access profiles" },
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    permissions: [
      { permission: "agenda.list", label: "View agenda" },
      { permission: "agenda.create", label: "Create agenda items" },
      { permission: "agenda.update", label: "Update agenda items" },
      { permission: "agenda.delete", label: "Delete agenda items" },
      { permission: "agenda.template", label: "Change agenda template" },
    ],
  },
  {
    id: "games",
    label: "Games & activities",
    permissions: [
      { permission: "quiz.manage", label: "Manage quizzes" },
      { permission: "quiz.run", label: "Run quiz sessions" },
      { permission: "spin.manage", label: "Manage spin challenges" },
      { permission: "spin.run", label: "Run spin challenges" },
    ],
  },
  {
    id: "voting",
    label: "Voting",
    permissions: [
      { permission: "vote.list", label: "View polls" },
      { permission: "vote.create", label: "Create polls" },
      { permission: "vote.manage", label: "Open and close polls" },
    ],
  },
  {
    id: "teams",
    label: "Teams & settings",
    permissions: [
      { permission: "team.list", label: "View teams" },
      { permission: "team.manage", label: "Manage teams" },
      { permission: "settings.broadcasting", label: "Manage broadcasting" },
      { permission: "settings.diagnostics", label: "View diagnostics" },
      { permission: "settings.auto_assign", label: "Configure auto-assign" },
    ],
  },
  {
    id: "customize",
    label: "Customize",
    permissions: [{ permission: "customize.branding", label: "Customize branding" }],
  },
  {
    id: "scoring",
    label: "Judging",
    permissions: [
      { permission: "score.submit", label: "Submit scores" },
      { permission: "score.view_all", label: "View all scores" },
    ],
  },
  {
    id: "participant",
    label: "Participant",
    permissions: [
      { permission: "participant.home", label: "Participant home" },
      { permission: "participant.activities", label: "Participant activities" },
      { permission: "participant.chat", label: "Team chat" },
      { permission: "participant.staff_chat", label: "Staff group chat" },
      { permission: "participant.quiz", label: "Play quizzes" },
      { permission: "participant.vote", label: "Cast votes" },
    ],
  },
  {
    id: "stage",
    label: "Main stage",
    permissions: [{ permission: "stage.view", label: "View main stage" }],
  },
];

export const ROLE_ASSIGNABLE_CATALOG = PERMISSION_CATALOG;

export const ROLE_ASSIGNABLE_PERMISSIONS: Permission[] = ROLE_ASSIGNABLE_CATALOG.flatMap((group) =>
  group.permissions.map((entry) => entry.permission),
);

export function normalizeRolePermissions(raw: unknown): RolePermission[] {
  if (!Array.isArray(raw)) return [];
  const out: RolePermission[] = [];
  for (const item of raw) {
    if (item === "*") {
      if (!out.includes("*")) out.push("*");
      continue;
    }
    if (typeof item === "string" && (ALL_PERMISSIONS as readonly string[]).includes(item)) {
      out.push(item as Permission);
    }
  }
  return out;
}

export function hasWildcardAccess(permissions: RolePermission[]): boolean {
  return permissions.some((p) => p === "*");
}

export function hasPermission(permissions: RolePermission[], permission: Permission): boolean {
  return permissions.some((p) => p === "*" || p === permission);
}

export function hasAnyPermission(permissions: RolePermission[], required: Permission[]): boolean {
  return required.some((p) => hasPermission(permissions, p));
}

export function hasAllPermissions(permissions: RolePermission[], required: Permission[]): boolean {
  return required.every((p) => hasPermission(permissions, p));
}

export function permissionsFingerprint(permissions: RolePermission[]): string {
  const normalized = [...permissions].sort();
  return JSON.stringify(normalized);
}
