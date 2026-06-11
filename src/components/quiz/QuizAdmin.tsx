"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { ACTIVITY_KAHOOT, formatInstanceScope } from "@/lib/activities/catalog";
import type { QuizStateSnapshot } from "@/types";

interface ActivityConfig {
  slug: string;
  allowGeneral: boolean;
  allowGroup: boolean;
}

interface ActivityInstance {
  id: string;
  title: string;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  questions: Array<{ id: string; text: string }>;
  sessions: Array<{ id: string; state: string }>;
}

export function QuizAdmin() {
  const { slug, path, api } = useEventApi();
  const socket = useSocket();
  const [instances, setInstances] = useState<ActivityInstance[]>([]);
  const [activityConfig, setActivityConfig] = useState<ActivityConfig | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [allowGeneral, setAllowGeneral] = useState(true);
  const [allowGroup, setAllowGroup] = useState(false);
  const [activeSession, setActiveSession] = useState<QuizStateSnapshot | null>(null);

  const load = () => api<{ quizzes: ActivityInstance[] }>("/quizzes").then((d) => setInstances(d.quizzes));

  useEffect(() => {
    load();
    api<{ activities: ActivityConfig[] }>("/activities")
      .then((d) => setActivityConfig(d.activities.find((a) => a.slug === ACTIVITY_KAHOOT) ?? null))
      .catch(() => setActivityConfig(null));
  }, [slug, api]);

  useEffect(() => {
    if (!socket) return;
    socket.on("quiz:state", setActiveSession);
    return () => {
      socket.off("quiz:state", setActiveSession);
    };
  }, [socket]);

  const createInstance = async () => {
    if (!newTitle.trim()) return;
    await api("/quizzes", {
      method: "POST",
      body: JSON.stringify({
        title: newTitle,
        allowGeneralParticipants: allowGeneral,
        allowGroupParticipants: allowGroup,
      }),
    });
    setNewTitle("");
    load();
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
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Live Trivia</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and run real-time trivia activity sessions.
        </p>
        <div className="mt-4 space-y-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Activity title"
          />
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">Who can participate?</p>
            <div className="flex flex-wrap gap-4">
              {activityConfig?.allowGeneral && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowGeneral}
                    onChange={(e) => setAllowGeneral(e.target.checked)}
                  />
                  Whole event
                </label>
              )}
              {activityConfig?.allowGroup && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowGroup}
                    onChange={(e) => setAllowGroup(e.target.checked)}
                  />
                  Team scoped
                </label>
              )}
            </div>
            {allowGroup && (
              <p className="text-xs text-muted-foreground">
                Each team participates separately. All teams with assigned members can join.
              </p>
            )}
          </div>
          <Button onClick={createInstance}>Create activity</Button>
        </div>
      </Card>

      {instances.map((instance) => (
        <Card key={instance.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">{instance.title}</h3>
              <p className="text-sm text-muted-foreground">
                {instance.questions.length} questions ·{" "}
                {formatInstanceScope({
                  allowGeneralParticipants: instance.allowGeneralParticipants,
                  allowGroupParticipants: instance.allowGroupParticipants,
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
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
                    if (file) void uploadQuestions(instance.id, file);
                  }}
                />
              </label>
              <Button onClick={() => socket?.emit("quiz:admin:start", instance.id)}>
                Start session
              </Button>
              {activeSession?.sessionId && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => socket?.emit("quiz:admin:next", activeSession.sessionId)}
                  >
                    Next question
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => socket?.emit("quiz:admin:end", activeSession.sessionId)}
                  >
                    End session
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
