import { Chess } from "chess.js";

export interface ChessState {
  fen: string;
  moves: string[];
}

export function createChessState(): ChessState {
  const chess = new Chess();
  return { fen: chess.fen(), moves: [] };
}

export function applyChessMove(
  state: ChessState,
  from: string,
  to: string,
  promotion?: string,
): { state: ChessState; winnerUserId: string | null; isDraw: boolean; error?: string } {
  const chess = new Chess(state.fen);
  try {
    const move = chess.move({ from, to, promotion: promotion as "q" | undefined });
    if (!move) {
      return { state, winnerUserId: null, isDraw: false, error: "Illegal move." };
    }
  } catch {
    return { state, winnerUserId: null, isDraw: false, error: "Illegal move." };
  }

  const next: ChessState = {
    fen: chess.fen(),
    moves: [...state.moves, `${from}${to}${promotion ?? ""}`],
  };

  if (chess.isGameOver()) {
    if (chess.isCheckmate()) {
      return { state: next, winnerUserId: "pending", isDraw: false };
    }
    if (chess.isDraw()) {
      return { state: next, winnerUserId: null, isDraw: true };
    }
  }

  return { state: next, winnerUserId: null, isDraw: false };
}

export function chessTurnColor(fen: string): "w" | "b" {
  return fen.includes(" w ") ? "w" : "b";
}
