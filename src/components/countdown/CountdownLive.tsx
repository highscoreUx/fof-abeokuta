"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { getCountdownSyncedRemainingMs } from "@/lib/countdown/sync";
import type { CountdownStateSnapshot } from "@/lib/countdown/types";
import { CountdownDisplay } from "@/components/countdown/CountdownDisplay";

interface CountdownLiveProps {
  challengeId: string;
  initialSessionId?: string | null;
  compact?: boolean;
}

export function CountdownLive({
  challengeId,
  initialSessionId,
  compact = false,
}: CountdownLiveProps) {
  const socket = useSocket();
  const [state, setState] = useState<CountdownStateSnapshot | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const onState = (snapshot: CountdownStateSnapshot) => {
      if (snapshot.challengeId !== challengeId) return;
      setState(snapshot);
    };

    socket.on("countdown:state", onState);
    return () => {
      socket.off("countdown:state", onState);
    };
  }, [socket, challengeId]);

  useEffect(() => {
    if (!socket || !initialSessionId) return;
    socket.emit("countdown:join", initialSessionId);
  }, [socket, initialSessionId]);

  useEffect(() => {
    if (!state || state.state === "FINISHED") {
      setRemainingMs(state?.remainingMs ?? 0);
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
    <CountdownDisplay
      title={state.title}
      remainingMs={remainingMs}
      state={state.state}
      variant={compact ? "compact" : "default"}
    />
  );
}
