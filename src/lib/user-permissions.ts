import {
  resolveAccountPermissionList,
  resolveAccountPermissions,
} from "@/lib/account-permissions";
import { getProfilePermissions } from "@/lib/role-preset-cache";
import {
  normalizeRolePermissions,
  permissionsFingerprint,
  resolvePermissionsList,
  type Permission,
  type RolePermission,
} from "@/lib/permissions/catalog";
import { resolveMemberProfileSlug } from "@/lib/member-access";
import type { UserWithAccount } from "@/lib/user-display";

export function hasEventPermissionOverride(user: { permissions: unknown | null | undefined }): boolean {
  return user.permissions != null;
}

export function resolveUserRolePermissions(user: {
  permissions?: unknown | null;
  account: { permissions: unknown };
}): RolePermission[] {
  if (user.permissions != null) {
    return normalizeRolePermissions(user.permissions);
  }
  return resolveAccountPermissions(user.account);
}

export function resolveUserPermissionList(user: {
  permissions?: unknown | null;
  account: { permissions: unknown };
}): Permission[] {
  return resolvePermissionsList(resolveUserRolePermissions(user));
}

export function resolveUserPermissionsFingerprint(user: {
  permissions?: unknown | null;
  account: { permissions: unknown };
}): string {
  return permissionsFingerprint(resolveUserRolePermissions(user));
}

export function permissionsForEventAccessProfile(slug: string): RolePermission[] | null {
  if (slug === "participant") return null;
  return getProfilePermissions(slug);
}

export function resolveEffectiveProfileSlug(user: UserWithAccount): string {
  if (user.permissions != null) {
    return resolveMemberProfileSlug(user.permissions);
  }
  return resolveMemberProfileSlug(user.account.permissions);
}
