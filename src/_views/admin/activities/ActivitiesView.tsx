"use client";

import { useEffect, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { ActivitiesAdmin } from "@/components/admin/ActivitiesAdmin";
import { useEventNav } from "@/hooks/useEventNav";
import { useEventApi } from "@/hooks/useEventApi";
import { selectUserPermissions, useAuthStore } from "@/stores/authStore";
import { ACTIVITY_KAHOOT, ACTIVITY_SPIN_TO_BUILD } from "@/lib/activities/catalog";
import { Card, CardTitle } from "@/components/ui/card";

export function ActivitiesView() {
  const { nav } = useEventNav();
  const { api } = useEventApi();
  const permissions = useAuthStore(selectUserPermissions);
  const [anyEnabled, setAnyEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ activities: Array<{ slug: string; enabled: boolean }> }>("/activities")
      .then((data) => {
        const enabled = data.activities.some(
          (a) =>
            a.enabled && (a.slug === ACTIVITY_KAHOOT || a.slug === ACTIVITY_SPIN_TO_BUILD),
        );
        setAnyEnabled(enabled);
      })
      .catch(() => setAnyEnabled(false));
  }, [api]);

  return (
    <PermissionGuard anyOf={["quiz.manage", "spin.manage", "quiz.run", "spin.run"]}>
      <AppShell title="Activities" nav={nav}>
        {anyEnabled === false ? (
          <Card>
            <CardTitle>No activities enabled</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Platform admin must enable activity types for this event before you can configure
              them here.
            </p>
          </Card>
        ) : anyEnabled === true ? (
          <ActivitiesAdmin permissions={permissions} />
        ) : null}
      </AppShell>
    </PermissionGuard>
  );
}
