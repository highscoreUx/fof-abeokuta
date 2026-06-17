export interface ChessState {
  fen: string;
  moves: string[];
}

export interface SudokuState {
  puzzle: string;
  solution: string;
  boards: Record<string, string>;
  /** Per-player pencil marks: 81 strings of sorted note digits, e.g. "24" for 2 and 4. */
  pencils?: Record<string, string[]>;
  completedAt: Record<string, number>;
  startedAt: number;
}

export type WhotShape = "circle" | "triangle" | "cross" | "square" | "star" | "whot";

export interface WhotCard {
  id: string;
  number: number;
  shape: WhotShape;
  /** Star / Whot cards: scoring value printed inside the symbol (play uses `number`). */
  scorePoints?: number;
}

export type WhotPickPenalty = { kind: "two" | "three"; stack: number };

export type WhotLastCardCall = "semi" | "last";

export interface WhotState {
  deck: WhotCard[];
  hands: Record<string, WhotCard[]>;
  discard: WhotCard[];
  currentShape: WhotShape | null;
  playerOrder: string[];
  /** Stacked pick-two / pick-three awaiting the next player. */
  pickPenalty: WhotPickPenalty | null;
  /** Extra players to skip on the next turn advance (Suspension / Star 8). */
  pendingSkips: number;
  /** Same player plays again after Hold On (1). */
  holdOn: boolean;
  /** Tracks semi / last card announcements per player. */
  calledLastCard: Record<string, WhotLastCardCall | null>;
  /** Set when the game ended via tender — hand point totals per player. */
  tenderTotals?: Record<string, number>;
  endedByTender?: boolean;
}

export interface LudoPiece {
  id: number;
  position: number;
  /** Board corner (0–3) this token belongs to. */
  homeSeat: number;
}

export type LudoDiceRoll = [number, number];

/** Which die value to apply for a move (0/1 = single die, sum = both dice combined). */
export type LudoDieChoice = 0 | 1 | "sum";

export interface LudoState {
  pieces: Record<string, LudoPiece[]>;
  dice: LudoDiceRoll | null;
  /** Which dice have been spent this turn (after a roll). */
  diceUsed: [boolean, boolean];
  playerOrder: string[];
  lastRoll: LudoDiceRoll | null;
  /** Who rolled `lastRoll` (shown to both players after the turn ends). */
  lastRollUserId: string | null;
  mode: "standard" | "two_player";
  /** Corners each player controls (1 corner in 4-player, 2 in 2-player DM). */
  playerSeats: Record<string, number[]>;
  /** Set when this turn included a capture (capturing seed finished). */
  capturedThisTurn?: boolean;
}

/** 2-player DM: blue+yellow (bottom) vs red+green (top). */
export const LUDO_TWO_PLAYER_SEATS: ReadonlyArray<readonly [number, number]> = [
  [3, 2],
  [0, 1],
];

/** Seeds in each corner base (always 4). */
export const LUDO_SEEDS_PER_CORNER = 4;
