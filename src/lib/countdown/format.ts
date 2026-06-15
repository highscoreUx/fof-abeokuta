export function formatCountdownClock(totalMs: number): string {
  const totalSec = Math.max(0, Math.ceil(totalMs / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function parseDurationInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const seconds = Number.parseInt(trimmed, 10);
    return seconds > 0 ? seconds : null;
  }

  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  const minutes = Number.parseInt(match[1]!, 10);
  const seconds = Number.parseInt(match[2]!, 10);
  if (seconds >= 60) return null;
  const total = minutes * 60 + seconds;
  return total > 0 ? total : null;
}

export function formatDurationLabel(durationSec: number): string {
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}
