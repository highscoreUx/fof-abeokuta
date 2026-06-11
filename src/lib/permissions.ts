import type { Permission, RolePermission } from "@/lib/permissions/catalog";
import {
  hasAnyPermission,
  hasPermission,
  hasWildcardAccess,
} from "@/lib/permissions/catalog";

export * from "@/lib/permissions/catalog";
export * from "@/lib/permissions/default-bundles";

const PIN_TIER_BY_SLUG: Record<string, { min: number; max: number }> = {
  event_admin: { min: 0, max: 999 },
  coordinator: { min: 1000, max: 1999 },
  staff: { min: 1000, max: 1999 },
  judge: { min: 2000, max: 2999 },
  participant: { min: 3000, max: 3999 },
};

export function getPinRangeForRoleSlug(slug: string): { min: number; max: number } {
  return PIN_TIER_BY_SLUG[slug] ?? PIN_TIER_BY_SLUG.participant;
}

export function isPinInRoleSlugRange(pin: number, roleSlug: string): boolean {
  const range = getPinRangeForRoleSlug(roleSlug);
  return pin >= range.min && pin <= range.max;
}

export function canViewPassword(
  viewerPermissions: RolePermission[],
  targetRoleSlug: string,
  passwordDisplay?: string | null,
): boolean {
  if (!passwordDisplay) return false;
  if (hasWildcardAccess(viewerPermissions)) return true;
  if (hasPermission(viewerPermissions, "user.password.view")) {
    if (targetRoleSlug === "event_admin") {
      return hasWildcardAccess(viewerPermissions);
    }
    return true;
  }
  return false;
}

/** @deprecated use canViewPassword */
export const canViewPin = canViewPassword;

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

export function formatEmail(username: string): string {
  return `${username}@event.local`;
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
  "event_user_role.list",
  "settings.broadcasting",
  "settings.diagnostics",
];

export function hasAdminShellAccess(permissions: RolePermission[]): boolean {
  return hasWildcardAccess(permissions) || hasAnyPermission(permissions, ADMIN_ENTRY_PERMISSIONS);
}

export function resolveDefaultRoute(permissions: RolePermission[], pathPrefix: string): string {
  if (hasAdminShellAccess(permissions)) return `${pathPrefix}/admin`;
  if (hasPermission(permissions, "user.check_in")) return `${pathPrefix}/staff/check-in`;
  if (hasPermission(permissions, "score.submit")) return `${pathPrefix}/judge/scoring`;
  if (hasPermission(permissions, "participant.home")) return `${pathPrefix}/participant`;
  if (hasPermission(permissions, "stage.view")) return `${pathPrefix}/stage`;
  return `${pathPrefix}/participant`;
}

/** @deprecated use resolveDefaultRoute */
export function getDefaultRouteForRole(
  _role: string,
  pathPrefix: string,
): string {
  return `${pathPrefix}/admin`;
}
