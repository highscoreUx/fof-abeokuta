import { resolvePermissionsList } from "@/lib/permission-profiles";
import { resolveDefaultRoute } from "@/lib/permissions";
import { normalizeRolePermissions, type RolePermission } from "@/lib/permissions/catalog";
import {
  canAccessPath,
  isPlatformPath,
  pathPrefixForEventSlug,
  stripEventSlugPrefix,
} from "@/lib/route-access";

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
  isPlatformSession: boolean;
}): string {
  const { permissions, isPlatformSession } = options;
  const sanitized = sanitizeNextParam(options.next);

  if (sanitized && canAccessPath(permissions, sanitized)) {
    return sanitized;
  }

  if (isPlatformSession && isPlatformPath(sanitized ?? "/fg-admin")) {
    return "/fg-admin";
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

export function permissionsFromAccount(account: { permissions: unknown }): RolePermission[] {
  return normalizeRolePermissions(account.permissions);
}

export function permissionListFromAccount(account: { permissions: unknown }) {
  return resolvePermissionsList(permissionsFromAccount(account));
}
