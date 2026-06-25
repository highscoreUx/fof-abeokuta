export function getEventStartMs(iso: string): number {
  return new Date(iso).getTime();
}

export function isBeforeEventStart(iso: string, nowMs = Date.now()): boolean {
  return nowMs < getEventStartMs(iso);
}

export function shouldShowEventCountdown(
  event: { date: string; status: string },
  options?: { nowMs?: number; allowPreview?: boolean },
): boolean {
  if (options?.allowPreview) return false;
  if (event.status === "ARCHIVED") return false;
  return isBeforeEventStart(event.date, options?.nowMs);
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function getCountdownParts(targetMs: number, nowMs = Date.now()): CountdownParts {
  const totalMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(totalMs / 1000);

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  };
}

export function coverFallbackIndex(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash + slug.charCodeAt(i)) % 3;
  }
  return hash;
}

export function formatEventDate(iso: string): {
  long: string;
  short: string;
  time: string | null;
  calendar: string;
} {
  const date = new Date(iso);
  const long = date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const short = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const calendar = date.toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  return { long, short, time: hasTime ? time : null, calendar };
}
