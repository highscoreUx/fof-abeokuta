import { canAccessPlatform } from "@/lib/account-permissions";
import {
  canManageAgenda,
  hasAdminShellAccess,
  hasAnyPermission,
  hasPermission,
  type RolePermission,
} from "@/lib/permissions";
import { RESERVED_EVENT_SLUGS } from "@/lib/reserved-slugs";

function normalizePathname(path: string): string {
  const pathname = path.split("?")[0]?.split("#")[0] ?? "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname || "/";
}

/** Strip `/{eventSlug}` prefix when the first segment is an event slug. */
export function stripEventSlugPrefix(pathname: string): {
  eventSlug: string | null;
  path: string;
} {
  const normalized = normalizePathname(pathname);
  const segment = normalized.split("/").filter(Boolean)[0];
  if (!segment || RESERVED_EVENT_SLUGS.has(segment) || segment === "fg-admin") {
    return { eventSlug: null, path: normalized };
  }
  const rest = normalized.slice(segment.length + 1);
  return {
    eventSlug: segment,
    path: rest ? `/${rest}` : "/",
  };
}

export function isPlatformPath(path: string): boolean {
  const pathname = normalizePathname(path);
  return pathname === "/fg-admin" || pathname.startsWith("/fg-admin/");
}

export function inferEventSlugFromPath(path: string): string | null {
  return stripEventSlugPrefix(path).eventSlug;
}

export function pathPrefixForEventSlug(eventSlug: string, scopedPath: string): string {
  const { eventSlug: slugInPath } = stripEventSlugPrefix(scopedPath);
  if (slugInPath) return `/${slugInPath}`;
  return `/${eventSlug}`;
}

function canAccessEventPath(permissions: RolePermission[], path: string): boolean {
  if (path === "/home" || path.startsWith("/home/")) {
    return hasPermission(permissions, "participant.home") || hasAdminShellAccess(permissions);
  }
  if (path.startsWith("/admin/users")) {
    return hasPermission(permissions, "user.list");
  }
  if (path.startsWith("/admin/activities")) {
    return hasAnyPermission(permissions, ["quiz.manage", "spin.manage", "survey.manage"]);
  }
  if (path.startsWith("/admin/agenda")) {
    return canManageAgenda(permissions);
  }
  if (path.startsWith("/admin/customize")) {
    return hasPermission(permissions, "customize.branding");
  }
  if (path.startsWith("/admin/voting")) {
    return hasAnyPermission(permissions, ["vote.list", "vote.create", "vote.manage"]);
  }
  if (path.startsWith("/admin/settings")) {
    return hasAnyPermission(permissions, [
      "team.list",
      "team.manage",
      "settings.broadcasting",
      "settings.diagnostics",
    ]);
  }
  if (path.startsWith("/admin")) {
    return hasAdminShellAccess(permissions);
  }
  if (path.startsWith("/staff")) {
    return hasPermission(permissions, "user.check_in");
  }
  if (path.startsWith("/judge")) {
    return hasPermission(permissions, "score.submit");
  }
  if (path.startsWith("/stage")) {
    return hasPermission(permissions, "stage.view");
  }
  if (path.startsWith("/participant")) {
    return hasPermission(permissions, "participant.home");
  }
  return false;
}

export function canAccessPath(permissions: RolePermission[], targetPath: string): boolean {
  const pathname = normalizePathname(targetPath);
  if (pathname === "/login" || pathname === "/change-password") return true;
  if (pathname === "/fg-admin/access-denied") return true;
  if (isPlatformPath(pathname)) {
    return canAccessPlatform(permissions);
  }
  const { path } = stripEventSlugPrefix(pathname);
  return canAccessEventPath(permissions, path);
}
