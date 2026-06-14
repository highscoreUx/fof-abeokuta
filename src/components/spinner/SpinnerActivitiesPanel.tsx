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

const SOCKET_REFRESH_MS = 800;

export function SpinnerActivitiesPanel() {
  const { api } = useEventApi();
  const socket = useSocket();
  const { graceRecords } = useParticipantActivitiesRegistry();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("spinner");
  const focusSession = searchParams.get("session");
  const [instances, setInstances] = useState<SpinnerInstance[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadInstances = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setInitialLoading(true);
      try {
        const data = await api<{ challenges: SpinnerInstance[] }>("/spin-challenges");
        setInstances(data.challenges);
      } catch {
        // Keep the last known list during background refresh failures.
      } finally {
        if (!options?.silent) setInitialLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    void loadInstances();
  }, [loadInstances]);

  useEffect(() => {
    if (!socket) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void loadInstances({ silent: true });
      }, SOCKET_REFRESH_MS);
    };

    socket.on("spinner:state", scheduleRefresh);
    return () => {
      socket.off("spinner:state", scheduleRefresh);
      if (timer) clearTimeout(timer);
    };
  }, [socket, loadInstances]);

  if (initialLoading) {
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
