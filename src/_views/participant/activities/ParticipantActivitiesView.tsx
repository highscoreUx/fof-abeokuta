"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { SpinToBuild } from "@/components/spin/SpinToBuild";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { useEventNav } from "@/hooks/useEventNav";
import { useAuth } from "@/hooks/useAuth";
import { hasAdminShellAccess } from "@/lib/permissions";
import { SurveyPlayer } from "@/components/survey/SurveyPlayer";
import { ACTIVITY_KAHOOT, ACTIVITY_SPIN_TO_BUILD, ACTIVITY_SURVEY } from "@/lib/activities/catalog";
import { userHasEnabledActivity } from "@/lib/activities/client";
import { Card, CardTitle } from "@/components/ui/card";

export function ParticipantActivitiesView() {
  const { nav, participantNav } = useEventNav();
  const { user } = useAuth();
  const shellNav = user && hasAdminShellAccess(user.permissions) ? nav : participantNav;

  const kahootEnabled = userHasEnabledActivity(user, ACTIVITY_KAHOOT);
  const spinEnabled = userHasEnabledActivity(user, ACTIVITY_SPIN_TO_BUILD);
  const surveyEnabled = userHasEnabledActivity(user, ACTIVITY_SURVEY);
  const anyEnabled = kahootEnabled || spinEnabled || surveyEnabled;

  return (
    <PermissionGuard permission="participant.activities" allowAdminShell>
      <AppShell title="Activities" nav={shellNav}>
        {!anyEnabled ? (
          <Card>
            <CardTitle>No activities available</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              There are no activities enabled for this event right now.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {surveyEnabled && <SurveyPlayer />}
            {spinEnabled && <SpinToBuild />}
            {kahootEnabled && <QuizPlayer />}
          </div>
        )}
      </AppShell>
    </PermissionGuard>
  );
}
