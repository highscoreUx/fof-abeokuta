"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SpinnerLive } from "@/components/spinner/SpinnerLive";
import { SpinnerGraceResults } from "@/components/spinner/SpinnerFinishedResults";
import { useParticipantActivitiesRegistry } from "@/components/activities/participant-activities-registry";
import { completionGraceRemainingMs } from "@/lib/activities/completion-grace";
import { useEventApi } from "@/hooks/useEventApi";
import { useSocket } from "@/hooks/useSocket";

interface SpinnerInstance {
  id: string;
  title: string;
  activeSessionId?: string | null;
  config?: { options?: string[] };
}

export function SpinnerActivitiesPanel() {
  const { api } = useEventApi();
  const socket = useSocket();
  const { graceRecords } = useParticipantActivitiesRegistry();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("spinner");
  const focusSession = searchParams.get("session");
  const [instances, setInstances] = useState<SpinnerInstance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInstances = useCallback(() => {
    setLoading(true);
    api<{ challenges: SpinnerInstance[] }>("/spin-challenges")
      .then((d) => setInstances(d.challenges))
      .catch(() => setInstances([]))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      loadInstances();
    };
    socket.on("spinner:state", refresh);
    return () => {
      socket.off("spinner:state", refresh);
    };
  }, [socket, loadInstances]);

  if (loading) {
    return null;
  }

  const liveInstances = instances.filter((instance) => instance.activeSessionId);
  const liveSessionIds = new Set(
    liveInstances.map((instance) => instance.activeSessionId).filter(Boolean) as string[],
  );
  const graceSpinners = graceRecords.filter(
    (record): record is Extract<typeof record, { type: "spinner" }> =>
      record.type === "spinner" && !liveSessionIds.has(record.sessionId),
  );

  if (liveInstances.length === 0 && graceSpinners.length === 0) {
    return null;
  }

  const ordered = focusId
    ? [...liveInstances].sort((a, b) => (a.id === focusId ? -1 : b.id === focusId ? 1 : 0))
    : liveInstances;

  return (
    <div className="space-y-6">
      {ordered.map((instance) => (
        <SpinnerLive
          key={instance.id}
          challengeId={instance.id}
          initialSessionId={
            instance.id === focusId ? focusSession ?? instance.activeSessionId : instance.activeSessionId
          }
        />
      ))}
      {graceSpinners.map((record) => (
        <SpinnerGraceResults
          key={record.key}
          snapshot={record.snapshot}
          graceRemainingMs={completionGraceRemainingMs(record.completedAt)}
        />
      ))}
    </div>
  );
}
