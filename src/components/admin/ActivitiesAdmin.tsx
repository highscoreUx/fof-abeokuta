"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AddActivityModal } from "@/components/admin/AddActivityModal";
import { QuizStageDisplay } from "@/components/quiz/QuizStageDisplay";
import {
  ACTIVITY_KAHOOT,
  ACTIVITY_SPIN_TO_BUILD,
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

interface KahootInstance {
  kind: "kahoot";
  id: string;
  title: string;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  questionCount: number;
  questions: Array<{ id: string; text: string; options?: string[]; timeLimitSec?: number }>;
}

interface SpinInstance {
  kind: "spin";
  id: string;
  title: string;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  state: string;
}

type ActivityRow = KahootInstance | SpinInstance;

interface ActivitiesAdminProps {
  permissions: Permission[];
}

export function ActivitiesAdmin({ permissions }: ActivitiesAdminProps) {
  const { slug, path, api } = useEventApi();
  const socket = useSocket();
  const [eventActivities, setEventActivities] = useState<EventActivityConfig[]>([]);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<QuizStateSnapshot | null>(null);

  const canManageKahoot = hasPermission(permissions, "quiz.manage");
  const canRunKahoot = hasPermission(permissions, "quiz.run");
  const canManageSpin = hasPermission(permissions, "spin.manage");
  const canRunSpin = hasPermission(permissions, "spin.run");

  const load = useCallback(async () => {
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
          questions: KahootInstance["questions"];
        }>;
      }>("/quizzes").catch(() => ({ quizzes: [] }));
      for (const q of quizRes.quizzes) {
        next.push({
          kind: "kahoot",
          id: q.id,
          title: q.title,
          allowGeneralParticipants: q.allowGeneralParticipants,
          allowGroupParticipants: q.allowGroupParticipants,
          questionCount: q.questions.length,
          questions: q.questions,
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
          state: string;
        }>;
      }>("/spin-challenges").catch(() => ({ challenges: [] }));
      for (const c of spinRes.challenges) {
        if (c.state === "COMPLETED") continue;
        next.push({
          kind: "spin",
          id: c.id,
          title: c.title,
          allowGeneralParticipants: c.allowGeneralParticipants,
          allowGroupParticipants: c.allowGroupParticipants,
          state: c.state,
        });
      }
    }

    setRows(next);
  }, [api, canManageKahoot, canManageSpin, canRunKahoot, canRunSpin]);

  useEffect(() => {
    load();
  }, [slug, load]);

  useEffect(() => {
    if (!socket) return;
    const onQuiz = (snapshot: QuizStateSnapshot) => {
      setActiveQuiz(snapshot);
      if (snapshot.state === "FINISHED") void load();
    };
    const onSpin = () => void load();
    socket.on("quiz:state", onQuiz);
    socket.on("spin:state", onSpin);
    return () => {
      socket.off("quiz:state", onQuiz);
      socket.off("spin:state", onSpin);
    };
  }, [socket, load]);

  const handleCreate = async (data: {
    type: ActivitySlug;
    title: string;
    allowGeneralParticipants: boolean;
    allowGroupParticipants: boolean;
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
    } else {
      await api("/spin-challenges", {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          allowGeneralParticipants: data.allowGeneralParticipants,
          allowGroupParticipants: data.allowGroupParticipants,
        }),
      });
    }
    await load();
  };

  const uploadQuestions = async (instanceId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = useAuthStore.getState().accessToken;
    await globalThis.fetch(path(`/quizzes/${instanceId}/questions`), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    await load();
  };

  const typeLabel = (row: ActivityRow) =>
    row.kind === "kahoot" ? "Live Trivia" : "Spin to Build";

  const stateLabel = (row: ActivityRow) => {
    if (row.kind === "kahoot") return null;
    if (row.state === "ACTIVE" || row.state === "REVIEWING") return "Live";
    return "Draft";
  };

  const creatableCount = eventActivities.filter((a) => {
    if (!a.enabled) return false;
    if (a.slug === ACTIVITY_KAHOOT) return canManageKahoot;
    if (a.slug === ACTIVITY_SPIN_TO_BUILD) return canManageSpin;
    return false;
  }).length;

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
            const isExpanded = expandedId === row.id;
            const isActiveKahoot =
              row.kind === "kahoot" && activeQuiz?.quizId === row.id && activeQuiz.state !== "FINISHED";

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
                      {row.kind === "kahoot"
                        ? `${row.questionCount} question${row.questionCount === 1 ? "" : "s"}`
                        : "Design challenge"}
                      {" · "}
                      {scope}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {row.kind === "kahoot" && canManageKahoot && (
                      <label className="cursor-pointer">
                        <span className="inline-flex rounded-lg border border-border px-4 py-2 text-sm">
                          Upload CSV
                        </span>
                        <input
                          type="file"
                          accept=".csv,.xlsx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadQuestions(row.id, file);
                          }}
                        />
                      </label>
                    )}

                    {row.kind === "kahoot" && canRunKahoot && (
                      <>
                        {!isActiveKahoot && (
                          <Button onClick={() => socket?.emit("quiz:admin:start", row.id)}>
                            Start session
                          </Button>
                        )}
                        {isActiveKahoot && activeQuiz && (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() =>
                                socket?.emit("quiz:admin:next", activeQuiz.sessionId)
                              }
                            >
                              {activeQuiz.state === "LOBBY" ? "Start question" : "Next question"}
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() =>
                                socket?.emit("quiz:admin:end", activeQuiz.sessionId)
                              }
                            >
                              End session
                            </Button>
                          </>
                        )}
                      </>
                    )}

                    {row.kind === "spin" && canRunSpin && row.state === "IDLE" && (
                      <Button
                        onClick={() =>
                          socket?.emit("spin:admin:start", { challengeId: row.id })
                        }
                      >
                        Start session
                      </Button>
                    )}

                    {row.kind === "spin" && canRunSpin && row.state === "ACTIVE" && (
                      <Button
                        variant="secondary"
                        onClick={() => socket?.emit("spin:admin:complete", row.id)}
                      >
                        Complete
                      </Button>
                    )}

                    {row.kind === "kahoot" && row.questions.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      >
                        {isExpanded ? "Hide questions" : "Questions"}
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded && row.kind === "kahoot" && (
                  <div className="border-t border-border bg-foreground/[0.02] px-4 py-3">
                    <ol className="space-y-2 text-sm">
                      {row.questions.map((q, i) => (
                        <li key={q.id} className="rounded-lg bg-card px-3 py-2">
                          <span className="font-medium">
                            {i + 1}. {q.text}
                          </span>
                          {Array.isArray(q.options) && (
                            <span className="ml-2 text-muted-foreground">
                              ({q.options.length} options
                              {q.timeLimitSec ? ` · ${q.timeLimitSec}s` : ""})
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
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
