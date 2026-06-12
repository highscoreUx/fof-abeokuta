import { canAccessPlatform } from "@/lib/account-permissions";
import { resolvePermissionsList } from "@/lib/permission-profiles";
import { resolveDefaultRoute } from "@/lib/permissions";
import { normalizeRolePermissions, type RolePermission } from "@/lib/permissions/catalog";
import {
  canAccessPath,
  isPlatformPath,
  pathPrefixForEventSlug,
  stripEventSlugPrefix,
} from "@/lib/route-access";
import type { AccountSession } from "@/stores/authStore";

export function sanitizeNextParam(next: string | null | undefined): string | null {
  if (!next) return null;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/login")) return null;
  return trimmed;
}

export function resolvePostLoginRedirect(options: {
  next: string | null | undefined;
  permissions: RolePermission[];
  eventSlug?: string;
  pathPrefix?: string;
  isPlatformSession?: boolean;
}): string {
  const { permissions } = options;
  const sanitized = sanitizeNextParam(options.next);

  if (sanitized && canAccessPath(permissions, sanitized)) {
    return sanitized;
  }

  if (!sanitized && canAccessPlatform(permissions)) {
    return "/fg-admin/events";
  }

  if (canAccessPlatform(permissions) && sanitized && isPlatformPath(sanitized)) {
    return sanitized;
  }

  const eventSlug =
    options.eventSlug ??
    (sanitized ? stripEventSlugPrefix(sanitized).eventSlug : null) ??
    undefined;

  const pathPrefix =
    options.pathPrefix ??
    (eventSlug ? pathPrefixForEventSlug(eventSlug, sanitized ?? "/home") : "");

  return resolveDefaultRoute(permissions, pathPrefix);
}

/** Where to send an already-authenticated user who opened `/login`. */
export function resolveAuthenticatedLoginRedirect(options: {
  next: string | null | undefined;
  account: AccountSession;
}): string {
  const permissions = permissionsFromAccount(options.account);
  return resolvePostLoginRedirect({
    next: options.next,
    permissions,
    isPlatformSession: false,
  });
}

export function permissionsFromAccount(account: { permissions: unknown }): RolePermission[] {
  return normalizeRolePermissions(account.permissions);
}

export function permissionListFromAccount(account: { permissions: unknown }) {
  return resolvePermissionsList(permissionsFromAccount(account));
}
