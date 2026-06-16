"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import { SurveyPlayer } from "@/components/survey/SurveyPlayer";
import { SpinnerActivitiesPanel } from "@/components/spinner/SpinnerActivitiesPanel";
import { TicTacToeActivitiesPanel } from "@/components/tic-tac-toe/TicTacToeActivitiesPanel";
import { HangmanActivitiesPanel } from "@/components/hangman/HangmanActivitiesPanel";
import { CountdownActivitiesPanel } from "@/components/countdown/CountdownActivitiesPanel";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useEventNav } from "@/hooks/useEventNav";
import { hasAdminShellAccess } from "@/lib/permissions";
import {
  ACTIVITY_KAHOOT,
  ACTIVITY_SPINNER,
  ACTIVITY_SURVEY,
  ACTIVITY_TIC_TAC_TOE,
  ACTIVITY_COUNTDOWN,
  ACTIVITY_HANGMAN,
} from "@/lib/activities/catalog";
import { userHasEnabledActivity } from "@/lib/activities/client";
import { ParticipantActivitiesRegistryProvider } from "@/components/activities/participant-activities-registry";

function playTitle(params: URLSearchParams): string {
  if (params.get("trivia")) return "Live Trivia";
  if (params.get("ttt")) return "X and O";
  if (params.get("hangman")) return "Hangman";
  if (params.get("countdown")) return "Countdown";
  if (params.get("spinner")) return "Spinner";
  if (params.get("survey")) return "Survey";
  return "Activity";
}

function ParticipantPlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { nav, participantNav, home } = useEventNav();
  const shellNav = user && hasAdminShellAccess(user.permissions) ? nav : participantNav;

  const focus = useMemo(
    () => ({
      trivia: searchParams.get("trivia"),
      ttt: searchParams.get("ttt"),
      hangman: searchParams.get("hangman"),
      countdown: searchParams.get("countdown"),
      spinner: searchParams.get("spinner"),
      survey: searchParams.get("survey"),
      match: searchParams.get("match"),
      session: searchParams.get("session"),
      mode: searchParams.get("mode"),
    }),
    [searchParams],
  );

  const hasFocus = Boolean(
    focus.trivia ||
      focus.ttt ||
      focus.hangman ||
      focus.countdown ||
      focus.spinner ||
      focus.survey,
  );

  const kahootEnabled = userHasEnabledActivity(user, ACTIVITY_KAHOOT);
  const spinnerEnabled = userHasEnabledActivity(user, ACTIVITY_SPINNER);
  const surveyEnabled = userHasEnabledActivity(user, ACTIVITY_SURVEY);
  const tttEnabled = userHasEnabledActivity(user, ACTIVITY_TIC_TAC_TOE);
  const countdownEnabled = userHasEnabledActivity(user, ACTIVITY_COUNTDOWN);
  const hangmanEnabled = userHasEnabledActivity(user, ACTIVITY_HANGMAN);

  const showKahoot = Boolean(focus.trivia && kahootEnabled);
  const showSpinner = Boolean(focus.spinner && spinnerEnabled);
  const showSurvey = Boolean(focus.survey && surveyEnabled);
  const showTtt = Boolean(focus.ttt && tttEnabled);
  const showCountdown = Boolean(focus.countdown && countdownEnabled);
  const showHangman = Boolean(focus.hangman && hangmanEnabled);

  return (
    <PermissionGuard permission="participant.activities" allowAdminShell>
      <AppShell title={playTitle(searchParams)} nav={shellNav}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Full-screen activity view — return to chat anytime.
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push(`${home}?tab=chat`)}>
            Back to chat
          </Button>
        </div>

        {!hasFocus ? (
          <Card>
            <CardTitle>Open an activity from chat</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Official activities and live games are started from chat. Tap Join or Play on an
              activity card in General or your team channel.
            </p>
            <div className="mt-4">
              <Link href={`${home}?tab=chat`}>
                <Button>Go to chat</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {showHangman && <HangmanActivitiesPanel />}
            {showCountdown && <CountdownActivitiesPanel />}
            {showSurvey && <SurveyPlayer />}
            {showTtt && <TicTacToeActivitiesPanel />}
            {showSpinner && <SpinnerActivitiesPanel />}
            {showKahoot && <QuizPlayer />}
            {!showHangman &&
              !showCountdown &&
              !showSurvey &&
              !showTtt &&
              !showSpinner &&
              !showKahoot && (
                <Card>
                  <CardTitle>Activity unavailable</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This activity is not enabled for you or the event.
                  </p>
                </Card>
              )}
          </div>
        )}
      </AppShell>
    </PermissionGuard>
  );
}

export function ParticipantPlayView() {
  const { user } = useAuth();
  const eventSlug = user?.eventSlug ?? "default";

  return (
    <ParticipantActivitiesRegistryProvider eventSlug={eventSlug}>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ParticipantPlayContent />
      </Suspense>
    </ParticipantActivitiesRegistryProvider>
  );
}
