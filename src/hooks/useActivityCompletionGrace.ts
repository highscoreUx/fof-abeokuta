"use client";

import { useEffect, useState } from "react";
import {
  ACTIVITY_COMPLETION_GRACE_MS,
  completionGraceRemainingMs,
  hasCompletionGraceExpired,
  isWithinCompletionGrace,
} from "@/lib/activities/completion-grace";

export function useActivityCompletionGrace(completed: boolean) {
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (completed && completedAt === null) {
      setCompletedAt(Date.now());
    }
    if (!completed) {
      setCompletedAt(null);
    }
  }, [completed, completedAt]);

  useEffect(() => {
    if (completedAt === null) return;

    const tick = () => setNow(Date.now());
    tick();

    const remaining = ACTIVITY_COMPLETION_GRACE_MS - (Date.now() - completedAt);
    if (remaining <= 0) return;

    const interval = setInterval(tick, 1000);
    const timeout = setTimeout(tick, remaining);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [completedAt]);

  const inGracePeriod =
    completedAt !== null && isWithinCompletionGrace(completedAt, now);
  const graceExpired =
    completedAt !== null && hasCompletionGraceExpired(completedAt, now);
  const graceRemainingMs =
    completedAt !== null ? completionGraceRemainingMs(completedAt, now) : 0;

  return {
    completedAt,
    inGracePeriod,
    graceExpired,
    graceRemainingMs,
  };
}
