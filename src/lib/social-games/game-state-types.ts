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
  /** Board corner (0–3) this token belongs to. */
  homeSeat: number;
}

export type LudoDiceRoll = [number, number];

export interface LudoState {
  pieces: Record<string, LudoPiece[]>;
  dice: LudoDiceRoll | null;
  playerOrder: string[];
  lastRoll: LudoDiceRoll | null;
  mode: "standard" | "two_player";
  /** Corners each player controls (1 corner in 4-player, 2 in 2-player DM). */
  playerSeats: Record<string, number[]>;
}

/** 2-player DM: red+yellow vs green+blue. */
export const LUDO_TWO_PLAYER_SEATS: ReadonlyArray<readonly [number, number]> = [
  [0, 2],
  [1, 3],
];

/** Seeds in each corner base (always 4). */
export const LUDO_SEEDS_PER_CORNER = 4;
