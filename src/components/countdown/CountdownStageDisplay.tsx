"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { getCountdownSyncedRemainingMs } from "@/lib/countdown/sync";
import type { CountdownStateSnapshot } from "@/lib/countdown/types";
import { CountdownDisplay } from "@/components/countdown/CountdownDisplay";
import { cn } from "@/lib/utils";

interface CountdownStageDisplayProps {
  variant?: "default" | "stage";
}

export function CountdownStageDisplay({ variant = "stage" }: CountdownStageDisplayProps) {
  const socket = useSocket();
  const { api } = useEventApi();
  const [state, setState] = useState<CountdownStateSnapshot | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  const joinActiveSessions = useCallback(async () => {
    if (!socket) return;
    try {
      const data = await api<{ challenges: Array<{ activeSessionId?: string | null }> }>(
        "/countdown-challenges?view=list",
      );
      for (const challenge of data.challenges) {
        if (challenge.activeSessionId) {
          socket.emit("countdown:join", challenge.activeSessionId);
        }
      }
    } catch {
      // Ignore — socket updates may still arrive via event room.
    }
  }, [api, socket]);

  useEffect(() => {
    void joinActiveSessions();
  }, [joinActiveSessions]);

  useEffect(() => {
    if (!socket) return;

    const handler = (snapshot: CountdownStateSnapshot) => {
      if (snapshot.state === "FINISHED") {
        setState((prev) =>
          prev?.sessionId === snapshot.sessionId ? null : prev,
        );
        return;
      }
      setState(snapshot);
    };

    socket.on("countdown:state", handler);
    return () => {
      socket.off("countdown:state", handler);
    };
  }, [socket]);

  useEffect(() => {
    if (!state || state.state === "FINISHED") {
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      setRemainingMs(getCountdownSyncedRemainingMs(state));
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [state]);

  if (!state || state.state === "FINISHED") {
    return null;
  }

  return (
    <div className={cn(variant === "stage" && "mb-0")}>
      <CountdownDisplay
        title={state.title}
        remainingMs={remainingMs}
        state={state.state}
        variant={variant}
      />
    </div>
  );
}
