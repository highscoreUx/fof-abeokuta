"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { ActivitiesAdmin } from "@/components/admin/ActivitiesAdmin";
import { ACTIVITIES_ADMIN_PERMISSIONS } from "@/lib/activities/catalog";
import { selectUserPermissions, useAuthStore } from "@/stores/authStore";

export function ActivitiesView() {
  const permissions = useAuthStore(selectUserPermissions);

  return (
    <PermissionGuard anyOf={ACTIVITIES_ADMIN_PERMISSIONS} embedded>
      <ActivitiesAdmin permissions={permissions} />
    </PermissionGuard>
  );
}
