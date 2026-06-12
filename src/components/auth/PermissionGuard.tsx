"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccessDeniedPanel } from "@/components/auth/AccessDeniedPanel";
import { AuthLoadingPanel } from "@/components/auth/AuthLoadingPanel";
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
  title,
  description,
}: {
  children: React.ReactNode;
  permission?: Permission;
  anyOf?: Permission[];
  allowAdminShell?: boolean;
  title?: string;
  description?: string;
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
    }
  }, [isHydrated, isAuthenticated, user, router]);

  if (!isHydrated || !isAuthenticated || !user) {
    return <AuthLoadingPanel />;
  }

  if (!allowed) {
    return (
      <AccessDeniedPanel
        context="event"
        title={title}
        description={description}
        homeHref={resolveDefaultRoute(user.permissions, pathPrefix)}
        homeLabel="Go to your home"
      />
    );
  }

  return <>{children}</>;
}
