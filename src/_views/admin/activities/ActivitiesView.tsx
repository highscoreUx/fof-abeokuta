"use client";

import { useEffect, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { SpinToBuild } from "@/components/spin/SpinToBuild";
import { QuizAdmin } from "@/components/quiz/QuizAdmin";
import { useEventNav } from "@/hooks/useEventNav";
import { useEventApi } from "@/hooks/useEventApi";
import { selectUserPermissions, useAuthStore } from "@/stores/authStore";
import { hasPermission } from "@/lib/permissions";
import { ACTIVITY_KAHOOT, ACTIVITY_SPIN_TO_BUILD } from "@/lib/activities/catalog";
import { Card, CardTitle } from "@/components/ui/card";

interface EventActivityRow {
  slug: string;
  name: string;
  enabled: boolean;
}

export function ActivitiesView() {
  const { nav } = useEventNav();
  const { api } = useEventApi();
  const permissions = useAuthStore(selectUserPermissions);
  const canManageKahoot = hasPermission(permissions, "quiz.manage");
  const canManageSpin = hasPermission(permissions, "spin.manage");
  const [activities, setActivities] = useState<EventActivityRow[]>([]);

  useEffect(() => {
    api<{ activities: EventActivityRow[] }>("/activities")
      .then((data) => setActivities(data.activities))
      .catch(() => setActivities([]));
  }, [api]);

  const kahootEnabled = activities.find((a) => a.slug === ACTIVITY_KAHOOT)?.enabled ?? false;
  const spinEnabled = activities.find((a) => a.slug === ACTIVITY_SPIN_TO_BUILD)?.enabled ?? false;
  const anyEnabled = kahootEnabled || spinEnabled;

  return (
    <PermissionGuard anyOf={["quiz.manage", "spin.manage"]}>
      <AppShell title="Activities" nav={nav}>
        {!anyEnabled ? (
          <Card>
            <CardTitle>No activities enabled</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Platform admin must enable activity types for this event before you can configure them
              here.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {canManageKahoot && kahootEnabled && <QuizAdmin />}
            {canManageSpin && spinEnabled && <SpinToBuild admin />}
          </div>
        )}
      </AppShell>
    </PermissionGuard>
  );
}
