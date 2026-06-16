import type { BracketMatchContext } from "@/lib/activity-bracket/types";

export function formatBracketMatchLabel(bracket: BracketMatchContext): string {
  return `Round ${bracket.roundNumber} · Series ${bracket.teamAWins}–${bracket.teamBWins} (race to ${bracket.targetWins})`;
}
