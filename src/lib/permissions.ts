import type { Permission, RolePermission } from "@/lib/permissions/catalog";
import {
  hasAnyPermission,
  hasPermission,
  hasWildcardAccess,
} from "@/lib/permissions/catalog";

export * from "@/lib/permissions/catalog";
export * from "@/lib/permissions/default-bundles";

export function slugifyFirstName(firstName: string): string {
  const slug = firstName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
  return slug || "user";
}

export function formatUsername(
  firstName: string,
  lastName: string,
  middleName?: string | null,
): string {
  const parts = [firstName, lastName, middleName].filter(Boolean);
  return parts
    .join(".")
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");
}

const ADMIN_ENTRY_PERMISSIONS: Permission[] = [
  "dashboard.view",
  "user.list",
  "agenda.list",
  "quiz.manage",
  "spin.manage",
  "customize.branding",
  "team.list",
  "vote.list",
  "settings.broadcasting",
  "settings.diagnostics",
];

export function hasAdminShellAccess(permissions: RolePermission[]): boolean {
  return hasWildcardAccess(permissions) || hasAnyPermission(permissions, ADMIN_ENTRY_PERMISSIONS);
}

export function hasParticipantHomeAccess(permissions: RolePermission[]): boolean {
  return hasPermission(permissions, "participant.home") || hasAdminShellAccess(permissions);
}

export function canManageAgenda(permissions: RolePermission[]): boolean {
  return hasAnyPermission(permissions, [
    "agenda.list",
    "agenda.create",
    "agenda.update",
    "agenda.delete",
    "agenda.template",
  ]);
}

export function resolveDefaultRoute(permissions: RolePermission[], pathPrefix: string): string {
  if (hasAdminShellAccess(permissions)) return `${pathPrefix}/home`;
  if (hasPermission(permissions, "user.check_in")) return `${pathPrefix}/staff/check-in`;
  if (hasPermission(permissions, "score.submit")) return `${pathPrefix}/judge/scoring`;
  if (hasPermission(permissions, "participant.home")) return `${pathPrefix}/home`;
  if (hasPermission(permissions, "stage.view")) return `${pathPrefix}/stage`;
  return `${pathPrefix}/home`;
}

/** @deprecated use resolveDefaultRoute */
export function getDefaultRouteForRole(
  _role: string,
  pathPrefix: string,
): string {
  return `${pathPrefix}/admin`;
}
