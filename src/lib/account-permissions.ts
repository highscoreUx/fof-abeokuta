import {
  hasAnyPermission,
  hasPermission,
  hasWildcardAccess,
  normalizeRolePermissions,
  permissionsFingerprint,
  type Permission,
  type RolePermission,
} from "@/lib/permissions/catalog";
import { resolvePermissionsList } from "@/lib/permissions/catalog";

export const PLATFORM_ADMIN_PERMISSION = "platform.admin" satisfies Permission;

export function resolveAccountPermissions(account: { permissions: unknown }): RolePermission[] {
  return normalizeRolePermissions(account.permissions);
}

export function resolveAccountPermissionList(account: { permissions: unknown }): Permission[] {
  return resolvePermissionsList(resolveAccountPermissions(account));
}

export function canAccessPlatform(permissions: RolePermission[]): boolean {
  return hasPermission(permissions, PLATFORM_ADMIN_PERMISSION);
}

export function accountAccessTokenFields(account: {
  id: string;
  email: string | null;
  username: string;
  permissions: unknown;
  permissionsVersion: number;
  mustChangePassword: boolean;
}) {
  const permissions = resolveAccountPermissions(account);
  return {
    accountId: account.id,
    email: account.email ?? "",
    username: account.username,
    permissions: resolvePermissionsList(permissions),
    permissionsFingerprint: permissionsFingerprint(permissions),
    accountPermissionsVersion: account.permissionsVersion,
    mustChangePassword: account.mustChangePassword,
  };
}

/** Participants must check in before signing in; staff and above do not. */
export function requiresEventCheckIn(permissions: RolePermission[]): boolean {
  if (hasWildcardAccess(permissions)) return false;
  if (
    hasAnyPermission(permissions, [
      PLATFORM_ADMIN_PERMISSION,
      "dashboard.view",
      "user.list",
      "user.check_in",
      "score.submit",
    ])
  ) {
    return false;
  }
  return hasPermission(permissions, "participant.home");
}

export function canAccessStaffChat(permissions: RolePermission[]): boolean {
  return (
    hasWildcardAccess(permissions) ||
    hasAnyPermission(permissions, [
      PLATFORM_ADMIN_PERMISSION,
      "dashboard.view",
      "user.check_in",
      "participant.staff_chat",
    ])
  );
}

export function isTeamAssignableMember(
  permissions: RolePermission[],
  includeStaff: boolean,
): boolean {
  if (hasPermission(permissions, "participant.home")) return true;
  if (includeStaff && hasPermission(permissions, "user.check_in")) return true;
  return false;
}

/** Used for socket role channels and legacy staff filters. */
export function primarySocketRoleSlug(permissions: RolePermission[]): string {
  if (hasWildcardAccess(permissions) || canAccessPlatform(permissions)) return "event_admin";
  if (hasPermission(permissions, "dashboard.view")) return "coordinator";
  if (hasPermission(permissions, "user.check_in")) return "staff";
  if (hasPermission(permissions, "score.submit")) return "judge";
  return "participant";
}
