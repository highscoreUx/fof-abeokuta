"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEventPathPrefix } from "@/hooks/useEventSlug";
import { loginPath } from "@/lib/routes";
import {
  hasAnyPermission,
  hasAdminShellAccess,
  hasPermission,
  resolveDefaultRoute,
} from "@/lib/permissions";
import type { Permission } from "@/lib/permissions/catalog";

export function PermissionGuard({
  children,
  permission,
  anyOf,
  allowAdminShell = false,
}: {
  children: React.ReactNode;
  permission?: Permission;
  anyOf?: Permission[];
  allowAdminShell?: boolean;
}) {
  const pathPrefix = useEventPathPrefix();
  const { user, isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();

  const allowed = user
    ? allowAdminShell && hasAdminShellAccess(user.permissions)
      ? true
      : permission
        ? hasPermission(user.permissions, permission)
        : anyOf
          ? hasAnyPermission(user.permissions, anyOf)
          : true
    : false;

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated || !user) {
      const returnTo =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/home";
      router.replace(loginPath(returnTo));
      return;
    }
    if (!allowed) {
      router.replace(resolveDefaultRoute(user.permissions, pathPrefix));
    }
  }, [isHydrated, isAuthenticated, user, allowed, router, pathPrefix]);

  if (!isHydrated || !user || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
