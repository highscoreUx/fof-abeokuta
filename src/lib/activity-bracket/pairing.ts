import type { BracketPairing } from "@/lib/activity-bracket/types";

/** Fisher–Yates shuffle (mutates copy). */
export function shuffleTeamIds(teamIds: string[]): string[] {
  const arr = [...teamIds];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Randomly pair teams; odd count out gets a bye into the next round. */
export function pairTeamsForRound(teamIds: string[]): BracketPairing[] {
  if (teamIds.length === 0) return [];
  if (teamIds.length === 1) {
    return [{ teamAId: teamIds[0]!, teamBId: null, isBye: true }];
  }

  const shuffled = shuffleTeamIds(teamIds);
  const pairings: BracketPairing[] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      pairings.push({
        teamAId: shuffled[i]!,
        teamBId: shuffled[i + 1]!,
        isBye: false,
      });
    } else {
      pairings.push({
        teamAId: shuffled[i]!,
        teamBId: null,
        isBye: true,
      });
    }
  }

  return pairings;
}
