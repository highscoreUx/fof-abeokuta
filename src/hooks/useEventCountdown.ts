"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCountdownParts,
  getEventStartMs,
  isBeforeEventStart,
  type CountdownParts,
} from "@/lib/event-schedule";

export function useEventCountdown(eventDateIso: string) {
  const startMs = useMemo(() => getEventStartMs(eventDateIso), [eventDateIso]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const isBeforeStart = isBeforeEventStart(eventDateIso, nowMs);
  const parts: CountdownParts = useMemo(
    () => getCountdownParts(startMs, nowMs),
    [startMs, nowMs],
  );

  useEffect(() => {
    if (!isBeforeStart) return;

    const tick = () => setNowMs(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isBeforeStart, startMs]);

  return {
    isBeforeStart,
    parts,
    startMs,
  };
}
