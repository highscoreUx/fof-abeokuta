export const ACTIVITY_COMPLETION_GRACE_MS = 2 * 60 * 1000;

export function isWithinCompletionGrace(completedAt: number, now = Date.now()) {
  return now - completedAt < ACTIVITY_COMPLETION_GRACE_MS;
}

export function hasCompletionGraceExpired(completedAt: number, now = Date.now()) {
  return now - completedAt >= ACTIVITY_COMPLETION_GRACE_MS;
}

export function completionGraceRemainingMs(completedAt: number, now = Date.now()) {
  return Math.max(0, ACTIVITY_COMPLETION_GRACE_MS - (now - completedAt));
}

export function formatGraceCountdown(ms: number) {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
