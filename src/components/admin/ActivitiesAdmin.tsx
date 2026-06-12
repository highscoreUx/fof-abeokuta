"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ActivitiesListSkeleton } from "@/components/admin/ActivitiesListSkeleton";
import { AddActivityModal } from "@/components/admin/AddActivityModal";
import type { ActivityDetail, KahootActivityDetail } from "@/types/activities";
import { QuizStageDisplay } from "@/components/quiz/QuizStageDisplay";
import { CardTitle } from "@/components/ui/card";
import {
  ACTIVITY_KAHOOT,
  ACTIVITY_SPINNER,
  ACTIVITY_SURVEY,
  formatInstanceScope,
  type ActivitySlug,
} from "@/lib/activities/catalog";
import type { Permission } from "@/lib/permissions/catalog";
import { hasPermission } from "@/lib/permissions";
import type { QuizStateSnapshot } from "@/types";

interface EventActivityConfig {
  slug: ActivitySlug;
  name: string;
  enabled: boolean;
  allowGeneral: boolean;
  allowGroup: boolean;
}

type ActivityRow = ActivityDetail;

interface ActivitiesAdminProps {
  permissions: Permission[];
}

export function ActivitiesAdmin({ permissions }: ActivitiesAdminProps) {
  const { slug, api } = useEventApi();
  const { activityConfigure } = useEventNav();
  const socket = useSocket();
  const [eventActivities, setEventActivities] = useState<EventActivityConfig[]>([]);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<QuizStateSnapshot | null>(null);

  const canManageKahoot = hasPermission(permissions, "quiz.manage");
  const canRunKahoot = hasPermission(permissions, "quiz.run");
  const canManageSpin = hasPermission(permissions, "spin.manage");
  const canRunSpin = hasPermission(permissions, "spin.run");
  const canManageSurvey = hasPermission(permissions, "survey.manage");
  const canRunSurvey = hasPermission(permissions, "survey.run");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const activityRes = await api<{ activities: EventActivityConfig[] }>("/activities").catch(
      () => ({ activities: [] as EventActivityConfig[] }),
    );
    setEventActivities(activityRes.activities as EventActivityConfig[]);

    const next: ActivityRow[] = [];

    if (canManageKahoot || canRunKahoot) {
      const quizRes = await api<{
        quizzes: Array<{
          id: string;
          title: string;
          allowGeneralParticipants: boolean;
          allowGroupParticipants: boolean;
          questions: KahootActivityDetail["questions"];
        }>;
      }>("/quizzes").catch(() => ({ quizzes: [] }));
      for (const q of quizRes.quizzes) {
        next.push({
          kind: "kahoot",
          id: q.id,
          title: q.title,
          allowGeneralParticipants: q.allowGeneralParticipants,
          allowGroupParticipants: q.allowGroupParticipants,
          questions: q.questions.map((question) => ({
            ...question,
            options: Array.isArray(question.options)
              ? (question.options as string[])
              : undefined,
          })),
        });
      }
    }

    if (canManageSpin || canRunSpin) {
      const spinRes = await api<{
        challenges: Array<{
          id: string;
          title: string;
          allowGeneralParticipants: boolean;
          allowGroupParticipants: boolean;
          participationMode?: "CONCURRENT" | "ONE_AT_A_TIME";
          config?: { options?: string[] };
          activeSessionId?: string | null;
        }>;
      }>("/spin-challenges").catch(() => ({ challenges: [] }));
      for (const c of spinRes.challenges) {
        next.push({
          kind: "spinner",
          id: c.id,
          title: c.title,
          allowGeneralParticipants: c.allowGeneralParticipants,
          allowGroupParticipants: c.allowGroupParticipants,
          participationMode: c.participationMode,
          optionsCount: Array.isArray(c.config?.options) ? c.config.options.length : 0,
          activeSessionId: c.activeSessionId,
        });
      }
    }

    if (canManageSurvey || canRunSurvey) {
      const surveyRes = await api<{
        surveys: Array<{
          id: string;
          title: string;
          status: string;
          allowGeneralParticipants: boolean;
          allowGroupParticipants: boolean;
          opensAt: string | null;
          closesAt: string | null;
          allowEditsUntilClose: boolean;
          questions: Array<{ id: string; type: string; text: string }>;
          _count?: { responses: number };
        }>;
      }>("/surveys").catch(() => ({ surveys: [] }));
      for (const s of surveyRes.surveys) {
        next.push({
          kind: "survey",
          id: s.id,
          title: s.title,
          status: s.status,
          allowGeneralParticipants: s.allowGeneralParticipants,
          allowGroupParticipants: s.allowGroupParticipants,
          opensAt: s.opensAt,
          closesAt: s.closesAt,
          allowEditsUntilClose: s.allowEditsUntilClose,
          questions: s.questions.map((q) => ({
            id: q.id,
            type: q.type as "POLL",
            text: q.text,
          })),
          responseCount: s._count?.responses,
        });
      }
    }

    setRows(next);
    setLoading(false);
    return next;
  }, [api, canManageKahoot, canManageSpin, canManageSurvey, canRunKahoot, canRunSpin, canRunSurvey]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  useEffect(() => {
    void load();
  }, [slug, load]);

  useEffect(() => {
    if (!socket) return;
    const onQuiz = (snapshot: QuizStateSnapshot) => {
      setActiveQuiz(snapshot);
      if (snapshot.state === "FINISHED") void refresh();
    };
    const onSpinner = () => void refresh();
    socket.on("quiz:state", onQuiz);
    socket.on("spinner:state", onSpinner);
    return () => {
      socket.off("quiz:state", onQuiz);
      socket.off("spinner:state", onSpinner);
    };
  }, [socket, refresh]);

  const handleCreate = async (data: {
    type: ActivitySlug;
    title: string;
    allowGeneralParticipants: boolean;
    allowGroupParticipants: boolean;
    participationMode?: "CONCURRENT" | "ONE_AT_A_TIME";
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

  const typeLabel = (row: ActivityRow) => {
    if (row.kind === "kahoot") return "Live Trivia";
    if (row.kind === "survey") return "Survey";
    return "Spinner";
  };

  const stateLabel = (row: ActivityRow) => {
    if (row.kind === "kahoot") return null;
    if (row.kind === "survey") {
      if (row.status === "OPEN") return "Open";
      if (row.status === "CLOSED") return "Closed";
      return "Draft";
    }
    if (row.kind === "spinner" && row.activeSessionId) return "Live";
    return "Ready";
  };

  const creatableCount = eventActivities.filter((a) => {
    if (!a.enabled) return false;
    if (a.slug === ACTIVITY_KAHOOT) return canManageKahoot;
    if (a.slug === ACTIVITY_SPINNER) return canManageSpin;
    if (a.slug === ACTIVITY_SURVEY) return canManageSurvey;
    return false;
  }).length;

  if (loading) {
    return <ActivitiesListSkeleton />;
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
                            status === "Live"
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
                        ? `${row.questions.length} question${row.questions.length === 1 ? "" : "s"}`
                        : `${row.optionsCount ?? 0} wheel option${(row.optionsCount ?? 0) === 1 ? "" : "s"}`}
                      {" · "}
                      {scope}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {((row.kind === "kahoot" && canManageKahoot) ||
                      (row.kind === "spinner" && canManageSpin) ||
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

      <AddActivityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        permissions={permissions}
        eventActivities={eventActivities}
        onCreate={handleCreate}
      />

    </div>
  );
}
