"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CountdownLive } from "@/components/countdown/CountdownLive";
import { useEventApi } from "@/hooks/useEventApi";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardTitle } from "@/components/ui/card";

interface CountdownInstance {
  id: string;
  title: string;
  activeSessionId?: string | null;
}

const SOCKET_REFRESH_MS = 800;

export function CountdownActivitiesPanel() {
  const { api } = useEventApi();
  const socket = useSocket();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("countdown");
  const focusSession = searchParams.get("session");
  const [instances, setInstances] = useState<CountdownInstance[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadInstances = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setInitialLoading(true);
      try {
        const data = await api<{ challenges: CountdownInstance[] }>("/countdown-challenges");
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

    socket.on("countdown:state", scheduleRefresh);
    return () => {
      socket.off("countdown:state", scheduleRefresh);
      if (timer) clearTimeout(timer);
    };
  }, [socket, loadInstances]);

  if (initialLoading) {
    return null;
  }

  const liveInstances = instances.filter((instance) => instance.activeSessionId);

  if (liveInstances.length === 0) {
    return null;
  }

  const ordered = focusId
    ? [...liveInstances].sort((a, b) => (a.id === focusId ? -1 : b.id === focusId ? 1 : 0))
    : liveInstances;

  return (
    <div className="space-y-6">
      {ordered.map((instance) => (
        <Card key={instance.id} className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <CardTitle className="text-base">{instance.title}</CardTitle>
          </div>
          <CountdownLive
            challengeId={instance.id}
            initialSessionId={
              instance.id === focusId
                ? focusSession ?? instance.activeSessionId
                : instance.activeSessionId
            }
          />
        </Card>
      ))}
    </div>
  );
}
