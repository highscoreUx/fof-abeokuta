"use client";

import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { useEventNav } from "@/hooks/useEventNav";
import { useAuth } from "@/hooks/useAuth";
import { hasAdminShellAccess } from "@/lib/permissions";
import { SurveyPlayer } from "@/components/survey/SurveyPlayer";
import { SpinnerActivitiesPanel } from "@/components/spinner/SpinnerActivitiesPanel";
import { ACTIVITY_KAHOOT, ACTIVITY_SPINNER, ACTIVITY_SURVEY } from "@/lib/activities/catalog";
import { userHasEnabledActivity } from "@/lib/activities/client";
import { Card, CardTitle } from "@/components/ui/card";

export function ParticipantActivitiesView() {
  const { nav, participantNav } = useEventNav();
  const { user } = useAuth();
  const shellNav = user && hasAdminShellAccess(user.permissions) ? nav : participantNav;

  const kahootEnabled = userHasEnabledActivity(user, ACTIVITY_KAHOOT);
  const spinnerEnabled = userHasEnabledActivity(user, ACTIVITY_SPINNER);
  const surveyEnabled = userHasEnabledActivity(user, ACTIVITY_SURVEY);
  const anyEnabled = kahootEnabled || spinnerEnabled || surveyEnabled;

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
            {spinnerEnabled && <SpinnerActivitiesPanel />}
            {kahootEnabled && <QuizPlayer />}
          </div>
        )}
      </AppShell>
    </PermissionGuard>
  );
}
