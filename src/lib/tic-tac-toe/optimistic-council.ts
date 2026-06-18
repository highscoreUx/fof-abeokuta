import type { TicTacToeMatchSnapshot } from "@/lib/tic-tac-toe/types";

export function applyOptimisticTttCouncilVote(
  snapshot: TicTacToeMatchSnapshot,
  userId: string,
  cellIndex: number,
): TicTacToeMatchSnapshot {
  return {
    ...snapshot,
    councilVotes: { ...snapshot.councilVotes, [userId]: cellIndex },
  };
}
