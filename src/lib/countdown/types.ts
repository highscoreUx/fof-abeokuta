export type CountdownSessionState = "RUNNING" | "PAUSED" | "FINISHED";

export interface CountdownStateSnapshot {
  sessionId: string;
  challengeId: string;
  title: string;
  durationSec: number;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  state: CountdownSessionState;
  segmentDurationMs: number;
  startedAt: number | null;
  pausedRemainingMs: number | null;
  remainingMs: number;
  serverNow: number;
}

export function computeCountdownRemainingMs(input: {
  state: CountdownSessionState;
  segmentDurationMs: number;
  startedAt: number | null;
  pausedRemainingMs: number | null;
  durationSec: number;
  serverNow: number;
}): number {
  if (input.state === "PAUSED" && input.pausedRemainingMs != null) {
    return input.pausedRemainingMs;
  }
  if (input.state === "RUNNING" && input.startedAt != null) {
    return Math.max(0, input.segmentDurationMs - (input.serverNow - input.startedAt));
  }
  if (input.state === "FINISHED") return 0;
  return input.durationSec * 1000;
}
