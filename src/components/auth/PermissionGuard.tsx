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

function ContentLoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function PermissionGuard({
  children,
  permission,
  anyOf,
  allowAdminShell = false,
  embedded = false,
  title,
  description,
}: {
  children: React.ReactNode;
  permission?: Permission;
  anyOf?: Permission[];
  allowAdminShell?: boolean;
  /** When true, loading/denied states render inside the shell content area instead of full screen. */
  embedded?: boolean;
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

    if (!isAuthenticated) {
      const returnTo =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/home";
      router.replace(loginPath(returnTo));
    }
  }, [isHydrated, isAuthenticated, router]);

  const LoadingPanel = embedded ? ContentLoadingPanel : AuthLoadingPanel;

  if (!isHydrated || !isAuthenticated) {
    return <LoadingPanel label="Loading…" />;
  }

  if (!user) {
    return <LoadingPanel label="Loading your session…" />;
  }

  if (!allowed) {
    if (embedded) {
      return (
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-foreground">{title ?? "Access denied"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {description ?? "You do not have permission to view this page."}
          </p>
        </div>
      );
    }

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
