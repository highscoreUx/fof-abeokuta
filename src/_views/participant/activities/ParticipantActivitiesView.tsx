"use client";

import { useEffect, useRef, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { useEventNav } from "@/hooks/useEventNav";
import { useAuth } from "@/hooks/useAuth";
import { hasAdminShellAccess } from "@/lib/permissions";
import { SurveyPlayer } from "@/components/survey/SurveyPlayer";
import { SpinnerActivitiesPanel } from "@/components/spinner/SpinnerActivitiesPanel";
import { TicTacToeActivitiesPanel } from "@/components/tic-tac-toe/TicTacToeActivitiesPanel";
import { HangmanActivitiesPanel } from "@/components/hangman/HangmanActivitiesPanel";
import { CountdownActivitiesPanel } from "@/components/countdown/CountdownActivitiesPanel";
import {
  ACTIVITY_KAHOOT,
  ACTIVITY_SPINNER,
  ACTIVITY_SURVEY,
  ACTIVITY_TIC_TAC_TOE,
  ACTIVITY_COUNTDOWN,
  ACTIVITY_HANGMAN,
} from "@/lib/activities/catalog";
import { userHasEnabledActivity } from "@/lib/activities/client";
import { Card, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  ParticipantActivitiesRegistryProvider,
  useParticipantActivitiesRegistry,
} from "@/components/activities/participant-activities-registry";
import { CompletedActivityCards } from "@/components/activities/CompletedActivityCards";

type ActivitiesTab = "active" | "completed";

const TAB_OPTIONS: Array<{ value: ActivitiesTab; label: string }> = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

function ParticipantActivitiesContent() {
  const { nav, participantNav } = useEventNav();
  const { user } = useAuth();
  const { completedRecords } = useParticipantActivitiesRegistry();
  const shellNav = user && hasAdminShellAccess(user.permissions) ? nav : participantNav;

  const kahootEnabled = userHasEnabledActivity(user, ACTIVITY_KAHOOT);
  const spinnerEnabled = userHasEnabledActivity(user, ACTIVITY_SPINNER);
  const surveyEnabled = userHasEnabledActivity(user, ACTIVITY_SURVEY);
  const tttEnabled = userHasEnabledActivity(user, ACTIVITY_TIC_TAC_TOE);
  const countdownEnabled = userHasEnabledActivity(user, ACTIVITY_COUNTDOWN);
  const hangmanEnabled = userHasEnabledActivity(user, ACTIVITY_HANGMAN);
  const anyEnabled =
    kahootEnabled ||
    spinnerEnabled ||
    surveyEnabled ||
    tttEnabled ||
    countdownEnabled ||
    hangmanEnabled;

  const [tab, setTab] = useState<ActivitiesTab>("active");
  const activitiesRef = useRef<HTMLDivElement>(null);
  const [noLiveActivities, setNoLiveActivities] = useState(false);

  useEffect(() => {
    const container = activitiesRef.current;
    if (!container || !anyEnabled || tab !== "active") {
      setNoLiveActivities(false);
      return;
    }

    const update = () => {
      setNoLiveActivities(container.childElementCount === 0);
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(container, { childList: true });
    return () => observer.disconnect();
  }, [anyEnabled, kahootEnabled, spinnerEnabled, surveyEnabled, tttEnabled, countdownEnabled, hangmanEnabled, tab]);

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
            <SegmentedControl value={tab} onChange={setTab} options={TAB_OPTIONS} />

            {tab === "active" ? (
              <>
                <div ref={activitiesRef} className="space-y-6">
                  {hangmanEnabled && <HangmanActivitiesPanel />}
                  {countdownEnabled && <CountdownActivitiesPanel />}
                  {surveyEnabled && <SurveyPlayer />}
                  {tttEnabled && <TicTacToeActivitiesPanel />}
                  {spinnerEnabled && <SpinnerActivitiesPanel />}
                  {kahootEnabled && <QuizPlayer />}
                </div>
                {noLiveActivities && (
                  <Card>
                    <CardTitle>No live activities</CardTitle>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nothing is running right now. Check back when a host starts an activity, or
                      view past results in Completed.
                    </p>
                  </Card>
                )}
              </>
            ) : (
              <CompletedActivityCards records={completedRecords} />
            )}
          </div>
        )}
      </AppShell>
    </PermissionGuard>
  );
}

export function ParticipantActivitiesView() {
  const { user } = useAuth();
  const eventSlug = user?.eventSlug ?? "default";

  return (
    <ParticipantActivitiesRegistryProvider eventSlug={eventSlug}>
      <ParticipantActivitiesContent />
    </ParticipantActivitiesRegistryProvider>
  );
}
