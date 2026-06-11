"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEventPathPrefix } from "@/hooks/useEventSlug";
import { loginPath } from "@/lib/routes";
import { getDefaultRouteForRole, hasMinimumRole } from "@/lib/permissions";
import type { Role } from "@/types";

export function RoleGuard({
  children,
  minimumRole,
}: {
  children: React.ReactNode;
  minimumRole: Role;
}) {
  const pathPrefix = useEventPathPrefix();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace(loginPath(pathPrefix));
      return;
    }
    if (!hasMinimumRole(user.role, minimumRole)) {
      router.replace(getDefaultRouteForRole(user.role, pathPrefix));
    }
  }, [isAuthenticated, user, minimumRole, router, pathPrefix]);

  if (!user || !hasMinimumRole(user.role, minimumRole)) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}
