"use client";

import { useEffect, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { ActivitiesAdmin } from "@/components/admin/ActivitiesAdmin";
import { ActivitiesListSkeleton } from "@/components/admin/ActivitiesListSkeleton";
import { useEventApi } from "@/hooks/useEventApi";
import { selectUserPermissions, useAuthStore } from "@/stores/authStore";
import {
  ACTIVITY_KAHOOT,
  ACTIVITY_SPINNER,
  ACTIVITY_SURVEY,
  ACTIVITY_TIC_TAC_TOE,
} from "@/lib/activities/catalog";
import { Card, CardTitle } from "@/components/ui/card";

export function ActivitiesView() {
  const { api } = useEventApi();
  const permissions = useAuthStore(selectUserPermissions);
  const [anyEnabled, setAnyEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ activities: Array<{ slug: string; enabled: boolean }> }>("/activities")
      .then((data) => {
        const enabled = data.activities.some(
          (a) =>
            a.enabled &&
            (a.slug === ACTIVITY_KAHOOT ||
              a.slug === ACTIVITY_SPINNER ||
              a.slug === "spin_to_build" ||
              a.slug === ACTIVITY_SURVEY ||
              a.slug === ACTIVITY_TIC_TAC_TOE),
        );
        setAnyEnabled(enabled);
      })
      .catch(() => setAnyEnabled(false));
  }, [api]);

  return (
    <PermissionGuard
      anyOf={[
        "quiz.manage",
        "spin.manage",
        "tic_tac_toe.manage",
        "survey.manage",
        "quiz.run",
        "spin.run",
        "tic_tac_toe.run",
        "survey.run",
      ]}
      embedded
    >
      {anyEnabled === false ? (
        <Card>
          <CardTitle>No activities enabled</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Platform admin must enable activity types for this event before you can configure them
            here.
          </p>
        </Card>
      ) : anyEnabled === true ? (
        <ActivitiesAdmin permissions={permissions} />
      ) : (
        <ActivitiesListSkeleton />
      )}
    </PermissionGuard>
  );
}
