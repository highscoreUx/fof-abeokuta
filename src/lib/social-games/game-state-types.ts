export interface ChessState {
  fen: string;
  moves: string[];
}

export interface SudokuState {
  puzzle: string;
  solution: string;
  boards: Record<string, string>;
  completedAt: Record<string, number>;
  startedAt: number;
}

export type WhotShape = "circle" | "triangle" | "cross" | "square" | "star" | "whot";

export interface WhotCard {
  id: string;
  number: number;
  shape: WhotShape;
}

export interface WhotState {
  deck: WhotCard[];
  hands: Record<string, WhotCard[]>;
  discard: WhotCard[];
  currentShape: WhotShape | null;
  drawStack: number;
  playerOrder: string[];
}

export interface LudoPiece {
  id: number;
  position: number;
}

export interface LudoState {
  pieces: Record<string, LudoPiece[]>;
  dice: number | null;
  playerOrder: string[];
  lastRoll: number | null;
}
