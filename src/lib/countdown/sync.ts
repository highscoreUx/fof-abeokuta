import type { CountdownStateSnapshot } from "@/lib/countdown/types";

/** Extrapolate remaining time from the last server snapshot (smooth local ticks). */
export function getCountdownSyncedRemainingMs(
  snapshot: Pick<CountdownStateSnapshot, "state" | "remainingMs" | "serverNow">,
  now = Date.now(),
): number {
  if (snapshot.state === "FINISHED") return 0;
  if (snapshot.state === "PAUSED") return snapshot.remainingMs;
  const drift = now - snapshot.serverNow;
  return Math.max(0, snapshot.remainingMs - drift);
}
