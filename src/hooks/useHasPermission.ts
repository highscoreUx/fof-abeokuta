"use client";

import { selectUserPermissions, useAuthStore } from "@/stores/authStore";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions/catalog";

export function usePermissions(): Permission[] {
  return useAuthStore(selectUserPermissions);
}

export function useHasPermission(permission: Permission): boolean {
  const permissions = usePermissions();
  return hasPermission(permissions, permission);
}

export function useHasAnyPermission(required: Permission[]): boolean {
  const permissions = usePermissions();
  return hasAnyPermission(permissions, required);
}
