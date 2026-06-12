/** Kahoot-style option colors and shapes for client UI. */
export const KAHOOT_OPTIONS = [
  { bg: "bg-[#e21b3c]", hover: "hover:bg-[#c41230]", shape: "▲", name: "red" },
  { bg: "bg-[#1368ce]", hover: "hover:bg-[#0f56a8]", shape: "◆", name: "blue" },
  { bg: "bg-[#d89e00]", hover: "hover:bg-[#b88700]", shape: "●", name: "yellow" },
  { bg: "bg-[#26890c]", hover: "hover:bg-[#1f7009]", shape: "■", name: "green" },
] as const;

export function formatPoints(n: number): string {
  return n.toLocaleString();
}

export function formatResponseTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function getServerSyncedRemainingMs(
  timeLimitSec: number,
  questionStartedAt: number,
  serverNow: number,
): number {
  const limitMs = timeLimitSec * 1000;
  const elapsed = serverNow - questionStartedAt;
  return Math.max(0, limitMs - elapsed);
}
