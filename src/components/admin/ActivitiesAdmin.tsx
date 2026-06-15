"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { useEventSettings } from "@/hooks/useEventSettings";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ActivitiesListSkeleton } from "@/components/admin/ActivitiesListSkeleton";
import { AddActivityModal } from "@/components/admin/AddActivityModal";
import {
  ACTIVITY_KAHOOT,
  ACTIVITY_SPINNER,
  ACTIVITY_SURVEY,
  ACTIVITY_TIC_TAC_TOE,
  ACTIVITY_COUNTDOWN,
  ACTIVITY_HANGMAN,
  formatInstanceScope,
  type ActivitySlug,
} from "@/lib/activities/catalog";
import type { Permission } from "@/lib/permissions/catalog";
import { hasPermission } from "@/lib/permissions";
import type {
  ActivityInstancesPayload,
  ActivityListItem,
  EventActivityConfigRow,
} from "@/types/activities";
import type { QuizStateSnapshot } from "@/types";
import type { CountdownStateSnapshot } from "@/lib/countdown/types";

const CountdownStageDisplay = dynamic(
  () =>
    import("@/components/countdown/CountdownStageDisplay").then((module) => ({
      default: module.CountdownStageDisplay,
    })),
  {
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading host view…</p>
    ),
  },
);

const QuizStageDisplay = dynamic(
  () =>
    import("@/components/quiz/QuizStageDisplay").then((module) => ({
      default: module.QuizStageDisplay,
    })),
  {
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading host view…</p>
    ),
  },
);

interface ActivitiesAdminProps {
  permissions: Permission[];
}

function activityQuestionCount(row: ActivityListItem): number {
  if (row.kind === "kahoot" || row.kind === "survey") {
    return row.questionCount;
  }
  return 0;
}

export function ActivitiesAdmin({ permissions }: ActivitiesAdminProps) {
  const { slug, api } = useEventApi();
  const { teamingEnabled } = useEventSettings();
  const { activityConfigure } = useEventNav();
  const needsRealtime =
    hasPermission(permissions, "quiz.run") ||
    hasPermission(permissions, "spin.run") ||
    hasPermission(permissions, "tic_tac_toe.run") ||
    hasPermission(permissions, "countdown.run") ||
    hasPermission(permissions, "hangman.run");
  const socket = useSocket();
  const [eventActivities, setEventActivities] = useState<EventActivityConfigRow[]>([]);
  const [rows, setRows] = useState<ActivityListItem[]>([]);
  const [anyEnabled, setAnyEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<QuizStateSnapshot | null>(null);

  const canManageKahoot = hasPermission(permissions, "quiz.manage");
  const canRunKahoot = hasPermission(permissions, "quiz.run");
  const canManageSpin = hasPermission(permissions, "spin.manage");
  const canManageSurvey = hasPermission(permissions, "survey.manage");
  const canRunSurvey = hasPermission(permissions, "survey.run");
  const canManageTtt = hasPermission(permissions, "tic_tac_toe.manage");
  const canRunCountdown = hasPermission(permissions, "countdown.run");
  const canManageCountdown = hasPermission(permissions, "countdown.manage");
  const canManageHangman = hasPermission(permissions, "hangman.manage");

  const [activeCountdown, setActiveCountdown] = useState<CountdownStateSnapshot | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await api<ActivityInstancesPayload>("/activities/instances");
        setEventActivities(data.activities);
        setRows(data.instances);
        setAnyEnabled(data.anyEnabled);
        return data.instances;
      } catch {
        setEventActivities([]);
        setRows([]);
        setAnyEnabled(false);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  useEffect(() => {
    void load();
  }, [slug, load]);

  useEffect(() => {
    if (!socket) return;
    for (const row of rows) {
      if (row.kind === "countdown" && row.activeSessionId) {
        socket.emit("countdown:join", row.activeSessionId);
      }
    }
  }, [socket, rows]);

  useEffect(() => {
    if (!needsRealtime || !socket) return;
    const onQuiz = (snapshot: QuizStateSnapshot) => {
      setActiveQuiz(snapshot);
      if (snapshot.state === "FINISHED") void refresh();
    };
    const onSpinner = () => void refresh();
    const onTtt = () => void refresh();
    const onCountdown = (snapshot: CountdownStateSnapshot) => {
      if (snapshot.state === "FINISHED") {
        setActiveCountdown((prev) =>
          prev?.sessionId === snapshot.sessionId ? null : prev,
        );
        void refresh();
        return;
      }
      setActiveCountdown(snapshot);
      void refresh();
    };
    const onHangman = () => void refresh();
    const onBracket = () => void refresh();
    socket.on("quiz:state", onQuiz);
    socket.on("spinner:state", onSpinner);
    socket.on("ttt:state", onTtt);
    socket.on("countdown:state", onCountdown);
    socket.on("hangman:state", onHangman);
    socket.on("bracket:state", onBracket);
    return () => {
      socket.off("quiz:state", onQuiz);
      socket.off("spinner:state", onSpinner);
      socket.off("ttt:state", onTtt);
      socket.off("countdown:state", onCountdown);
      socket.off("hangman:state", onHangman);
      socket.off("bracket:state", onBracket);
    };
  }, [needsRealtime, socket, refresh]);

  const handleCreate = async (data: {
    type: ActivitySlug;
    title: string;
    allowGeneralParticipants: boolean;
    allowGroupParticipants: boolean;
    participationMode?: "CONCURRENT" | "ONE_AT_A_TIME";
    ticTacToeMode?: "CHAMPION" | "COUNCIL";
    hangmanMode?: "CHAMPION" | "COUNCIL";
    competitionFormat?: "SINGLE_MATCH" | "CHAMPIONSHIP";
    targetWins?: number;
    durationSec?: number;
  }) => {
    if (data.type === ACTIVITY_KAHOOT) {
      await api("/quizzes", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          allowGeneralParticipants: data.allowGeneralParticipants,
          allowGroupParticipants: data.allowGroupParticipants,
        }),
      });
    } else if (data.type === ACTIVITY_SURVEY) {
      await api("/surveys", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          allowGeneralParticipants: data.allowGeneralParticipants,
          allowGroupParticipants: data.allowGroupParticipants,
          allowEditsUntilClose: true,
        }),
      });
    } else if (data.type === ACTIVITY_TIC_TAC_TOE) {
      await api("/tic-tac-toe-challenges", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          allowGeneralParticipants: data.allowGeneralParticipants,
          allowGroupParticipants: data.allowGroupParticipants,
          mode: data.ticTacToeMode ?? "CHAMPION",
          competitionFormat: data.competitionFormat ?? "SINGLE_MATCH",
          targetWins: data.targetWins ?? 1,
        }),
      });
    } else if (data.type === ACTIVITY_COUNTDOWN) {
      await api("/countdown-challenges", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          allowGeneralParticipants: data.allowGeneralParticipants,
          allowGroupParticipants: data.allowGroupParticipants,
          durationSec: data.durationSec,
        }),
      });
    } else if (data.type === ACTIVITY_HANGMAN) {
      await api("/hangman-challenges", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          allowGeneralParticipants: data.allowGeneralParticipants,
          allowGroupParticipants: data.allowGroupParticipants,
          mode: data.hangmanMode ?? "CHAMPION",
          competitionFormat: data.competitionFormat ?? "SINGLE_MATCH",
          targetWins: data.targetWins ?? 1,
          words: [],
        }),
      });
    } else {
      await api("/spin-challenges", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          allowGeneralParticipants: data.allowGeneralParticipants,
          allowGroupParticipants: data.allowGroupParticipants,
          participationMode: data.participationMode ?? "ONE_AT_A_TIME",
        }),
      });
    }
    await refresh();
  };

  const typeLabel = (row: ActivityListItem) => {
    if (row.kind === "kahoot") return "Live Trivia";
    if (row.kind === "survey") return "Survey";
    if (row.kind === "tic_tac_toe") return "Team Tic-Tac-Toe";
    if (row.kind === "hangman") return "Team Hangman";
    if (row.kind === "countdown") return "Countdown timer";
    return "Spinner";
  };

  const stateLabel = (row: ActivityListItem) => {
    if (row.kind === "kahoot") return null;
    if (row.kind === "survey") {
      if (row.status === "OPEN") return "Open";
      if (row.status === "CLOSED") return "Closed";
      return "Draft";
    }
    if (row.kind === "countdown" && row.activeSessionId) {
      return row.activeSessionState === "PAUSED" ? "Paused" : "Live";
    }
    if (row.kind === "spinner" && row.activeSessionId) return "Live";
    if (row.kind === "tic_tac_toe" && row.competitionFormat === "CHAMPIONSHIP") {
      if (row.bracketState === "ACTIVE") return "Championship live";
      if (row.bracketState === "FINISHED") return "Champion crowned";
      return "Championship ready";
    }
    if (row.kind === "hangman" && row.competitionFormat === "CHAMPIONSHIP") {
      if (row.bracketState === "ACTIVE") return "Championship live";
      if (row.bracketState === "FINISHED") return "Champion crowned";
      return "Championship ready";
    }
    if (row.kind === "tic_tac_toe" && row.activeMatchState === "ACTIVE") return "Live";
    if (row.kind === "hangman" && row.activeMatchState === "ACTIVE") return "Live";
    if (row.kind === "tic_tac_toe" && row.activeMatchState === "WAITING") return "Waiting";
    if (row.kind === "hangman" && row.activeMatchState === "WAITING") return "Waiting";
    return "Ready";
  };

  const creatableCount = eventActivities.filter((activity) => {
    if (!activity.enabled) return false;
    if (activity.slug === ACTIVITY_KAHOOT) return canManageKahoot;
    if (activity.slug === ACTIVITY_SPINNER) return canManageSpin;
    if (activity.slug === ACTIVITY_SURVEY) return canManageSurvey;
    if (activity.slug === ACTIVITY_TIC_TAC_TOE) return canManageTtt;
    if (activity.slug === ACTIVITY_COUNTDOWN) return canManageCountdown;
    if (activity.slug === ACTIVITY_HANGMAN) return canManageHangman;
    return false;
  }).length;

  if (loading) {
    return <ActivitiesListSkeleton />;
  }

  if (!anyEnabled) {
    return (
      <Card className="p-8">
        <CardTitle>No activities enabled</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          Platform admin must enable activity types for this event before you can configure them
          here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length === 0
            ? "No activities yet. Create one to get started."
            : `${rows.length} activit${rows.length === 1 ? "y" : "ies"}`}
        </p>
        {creatableCount > 0 && (
          <Button onClick={() => setModalOpen(true)}>Add activity</Button>
        )}
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Your activity list is empty.</p>
          {creatableCount > 0 && (
            <Button className="mt-4" onClick={() => setModalOpen(true)}>
              Add your first activity
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const scope = formatInstanceScope({
              allowGeneralParticipants: row.allowGeneralParticipants,
              allowGroupParticipants: row.allowGroupParticipants,
            });
            const status = stateLabel(row);
            const questionCount = activityQuestionCount(row);
            const isActiveKahoot =
              row.kind === "kahoot" &&
              activeQuiz?.quizId === row.id &&
              activeQuiz.state !== "FINISHED";

            return (
              <Card key={`${row.kind}-${row.id}`} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {typeLabel(row)}
                      </span>
                      {status && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            status === "Live" || status === "Championship live"
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {status}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-semibold">{row.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {row.kind === "kahoot" || row.kind === "survey"
                        ? `${questionCount} question${questionCount === 1 ? "" : "s"}`
                        : row.kind === "tic_tac_toe"
                          ? row.competitionFormat === "CHAMPIONSHIP"
                            ? `Championship · race to ${row.targetWins ?? 1} · ${row.mode === "COUNCIL" ? "Council" : "Champion"}`
                            : `${row.mode === "COUNCIL" ? "Council" : "Champion"} mode`
                          : row.kind === "hangman"
                            ? row.competitionFormat === "CHAMPIONSHIP"
                              ? `Championship · race to ${row.targetWins ?? 1} · ${row.mode === "COUNCIL" ? "Council" : "Champion"} · ${row.wordCount ?? 0} word${(row.wordCount ?? 0) === 1 ? "" : "s"}`
                              : `${row.mode === "COUNCIL" ? "Council" : "Champion"} · ${row.wordCount ?? 0} word${(row.wordCount ?? 0) === 1 ? "" : "s"}`
                            : row.kind === "countdown"
                            ? `${Math.floor(row.durationSec / 60)}:${(row.durationSec % 60).toString().padStart(2, "0")} timer`
                            : `${row.optionsCount ?? 0} wheel option${(row.optionsCount ?? 0) === 1 ? "" : "s"}`}
                      {" · "}
                      {scope}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {((row.kind === "kahoot" && canManageKahoot) ||
                      (row.kind === "spinner" && canManageSpin) ||
                      (row.kind === "tic_tac_toe" && canManageTtt) ||
                      (row.kind === "countdown" && canManageCountdown) ||
                      (row.kind === "hangman" && canManageHangman) ||
                      (row.kind === "survey" && canManageSurvey)) && (
                      <Link
                        href={activityConfigure(row.kind, row.id)}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground shadow-sm transition hover:bg-secondary-hover"
                      >
                        Configure
                      </Link>
                    )}
                    {row.kind === "kahoot" && canRunKahoot && !isActiveKahoot && (
                      <Button onClick={() => socket?.emit("quiz:admin:start", row.id)}>
                        Start session
                      </Button>
                    )}
                    {row.kind === "kahoot" && canRunKahoot && isActiveKahoot && activeQuiz && (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            socket?.emit("quiz:admin:next", activeQuiz.sessionId)
                          }
                        >
                          {activeQuiz.state === "LOBBY" ? "Start question" : "Next"}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() =>
                            socket?.emit("quiz:admin:end", activeQuiz.sessionId)
                          }
                        >
                          End
                        </Button>
                      </>
                    )}
                    {row.kind === "countdown" && canRunCountdown && !row.activeSessionId && (
                      <Button onClick={() => socket?.emit("countdown:admin:start", row.id)}>
                        Start timer
                      </Button>
                    )}
                    {row.kind === "countdown" &&
                      canRunCountdown &&
                      row.activeSessionId &&
                      activeCountdown?.challengeId === row.id &&
                      activeCountdown.state !== "FINISHED" && (
                        <>
                          {activeCountdown.state === "RUNNING" ? (
                            <Button
                              variant="secondary"
                              onClick={() =>
                                socket?.emit("countdown:admin:pause", activeCountdown.sessionId)
                              }
                            >
                              Pause
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() =>
                                socket?.emit("countdown:admin:resume", activeCountdown.sessionId)
                              }
                            >
                              Resume
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            onClick={() =>
                              socket?.emit("countdown:admin:adjust", {
                                sessionId: activeCountdown.sessionId,
                                deltaSec: 30,
                              })
                            }
                          >
                            +30s
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              socket?.emit("countdown:admin:adjust", {
                                sessionId: activeCountdown.sessionId,
                                deltaSec: -30,
                              })
                            }
                          >
                            −30s
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() =>
                              socket?.emit("countdown:admin:reset", activeCountdown.sessionId)
                            }
                          >
                            Reset
                          </Button>
                        </>
                      )}
                    {row.kind === "survey" && canRunSurvey && row.status !== "OPEN" && (
                      <Button
                        onClick={() =>
                          api(`/surveys/${row.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ status: "OPEN" }),
                          }).then(refresh)
                        }
                      >
                        Open survey
                      </Button>
                    )}
                    {row.kind === "survey" && canRunSurvey && row.status === "OPEN" && (
                      <Button
                        variant="danger"
                        onClick={() =>
                          api(`/surveys/${row.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ status: "CLOSED" }),
                          }).then(refresh)
                        }
                      >
                        Close survey
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeQuiz && activeQuiz.state !== "FINISHED" && (
        <Card>
          <CardTitle>Host view</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Show this on the main stage. Participants answer on their own devices.
          </p>
          <div className="mt-4">
            <QuizStageDisplay />
          </div>
        </Card>
      )}

      {activeCountdown && activeCountdown.state !== "FINISHED" && (
        <Card>
          <CardTitle>Host view</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Show this on the main stage so everyone sees the same synced timer.
          </p>
          <div className="mt-4">
            <CountdownStageDisplay variant="default" />
          </div>
        </Card>
      )}

      <AddActivityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        permissions={permissions}
        eventActivities={eventActivities}
        onCreate={handleCreate}
        teamingEnabled={teamingEnabled}
      />
    </div>
  );
}
