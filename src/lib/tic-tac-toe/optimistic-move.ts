import {
  checkWinner,
  isBoardFull,
  type TicTacToeMark,
  type TicTacToeMatchSnapshot,
} from "@/lib/tic-tac-toe/types";

export function applyOptimisticTttMove(
  snapshot: TicTacToeMatchSnapshot,
  cellIndex: number,
): TicTacToeMatchSnapshot {
  if (snapshot.board[cellIndex] !== null) return snapshot;

  const board = [...snapshot.board];
  const mark = snapshot.currentTurn;
  board[cellIndex] = mark;

  const winner = checkWinner(board);
  const draw = !winner && isBoardFull(board);
  const finished = Boolean(winner || draw);
  const nextTurn: TicTacToeMark = mark === "X" ? "O" : "X";

  let winnerTeamId = snapshot.winnerTeamId;
  let winnerUserId = snapshot.winnerUserId ?? null;

  if (winner === "X") {
    winnerTeamId = snapshot.teamX.id;
    winnerUserId = snapshot.isSocial ? (snapshot.playerX?.userId ?? null) : winnerUserId;
  }
  if (winner === "O") {
    winnerTeamId = snapshot.teamO.id;
    winnerUserId = snapshot.isSocial ? (snapshot.playerO?.userId ?? null) : winnerUserId;
  }

  return {
    ...snapshot,
    board,
    currentTurn: finished ? mark : nextTurn,
    turnNumber: snapshot.turnNumber + 1,
    state: finished ? "FINISHED" : snapshot.state,
    winnerTeamId: finished && winner ? winnerTeamId : snapshot.winnerTeamId,
    winnerUserId: finished ? (draw ? null : winnerUserId) : (snapshot.winnerUserId ?? null),
    isDraw: finished ? draw : snapshot.isDraw,
    councilVotes: {},
    councilVoteCounts: {},
  };
}

export function findOptimisticPendingCellIndex(
  server: TicTacToeMatchSnapshot | null,
  display: TicTacToeMatchSnapshot | null,
): number | null {
  if (!server || !display) return null;
  for (let index = 0; index < 9; index++) {
    if (display.board[index] !== null && server.board[index] === null) return index;
  }
  return null;
}
