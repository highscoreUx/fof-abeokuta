"use client";

import { canAccessPlatform } from "@/lib/account-permissions";
import { hasPermission } from "@/lib/permissions";
import { selectUserPermissions, useAuthStore } from "@/stores/authStore";

export function useCanEditLanding() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const permissions = useAuthStore(selectUserPermissions);

  const canEdit =
    isHydrated &&
    (canAccessPlatform(permissions) || hasPermission(permissions, "customize.branding"));

  return { canEdit, isHydrated };
}
