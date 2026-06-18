import type { HangmanMatchSnapshot } from "@/lib/hangman/types";

export function applyOptimisticHangmanCouncilVote(
  snapshot: HangmanMatchSnapshot,
  userId: string,
  letter: string,
): HangmanMatchSnapshot {
  return {
    ...snapshot,
    councilVotes: { ...snapshot.councilVotes, [userId]: letter.toUpperCase() },
  };
}
