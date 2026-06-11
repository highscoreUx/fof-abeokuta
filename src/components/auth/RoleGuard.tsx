"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEventSlug } from "@/hooks/useEventSlug";
import { getDefaultRouteForRole, hasMinimumRole } from "@/lib/permissions";
import type { Role } from "@/types";

export function RoleGuard({
  children,
  minimumRole,
}: {
  children: React.ReactNode;
  minimumRole: Role;
}) {
  const eventSlug = useEventSlug();
  const { user, isAuthenticated } = useAuth(eventSlug);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace(`/${eventSlug}/login`);
      return;
    }
    if (!hasMinimumRole(user.role, minimumRole)) {
      router.replace(getDefaultRouteForRole(user.role, eventSlug));
    }
  }, [isAuthenticated, user, minimumRole, router, eventSlug]);

  if (!user || !hasMinimumRole(user.role, minimumRole)) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
}
