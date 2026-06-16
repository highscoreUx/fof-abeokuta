import type { BracketMatchContext } from "@/lib/activity-bracket/types";

export type TicTacToeMode = "CHAMPION" | "COUNCIL";
export type TicTacToeMark = "X" | "O";
export type TicTacToeCell = TicTacToeMark | null;
export type TicTacToeMatchState = "WAITING" | "ACTIVE" | "FINISHED";

export const EMPTY_BOARD: TicTacToeCell[] = Array(9).fill(null);

export interface TicTacToeTeamInfo {
  id: string;
  letter: string;
  name: string;
  color: string;
}

export interface TicTacToeChampionInfo {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
}

import type { SocialTttSessionState } from "@/lib/chat-game-ttt-types";

export interface TicTacToeMatchSnapshot {
  matchId: string;
  challengeId: string;
  challengeTitle: string;
  mode: TicTacToeMode;
  state: TicTacToeMatchState;
  board: TicTacToeCell[];
  currentTurn: TicTacToeMark;
  turnNumber: number;
  teamX: TicTacToeTeamInfo;
  teamO: TicTacToeTeamInfo;
  championX: TicTacToeChampionInfo | null;
  championO: TicTacToeChampionInfo | null;
  councilVotes: Record<string, number>;
  councilVoteCounts: Record<number, number>;
  winnerTeamId: string | null;
  isDraw: boolean;
  bracket?: BracketMatchContext | null;
  /** Social chat game — players are individuals, not teams. */
  isSocial?: boolean;
  playerX?: TicTacToeChampionInfo | null;
  playerO?: TicTacToeChampionInfo | null;
  winnerUserId?: string | null;
  chatSessionId?: string | null;
  socialTtt?: SocialTttSessionState;
  serverNow: number;
}

export const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export function checkWinner(board: TicTacToeCell[]): TicTacToeMark | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

export function isBoardFull(board: TicTacToeCell[]): boolean {
  return board.every((cell) => cell !== null);
}
