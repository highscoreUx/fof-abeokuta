/** Classic 15×15 Ludo board — colors match standard Ludo (reference layout). */

export const LUDO_GRID = 15;

/** 52 outer-track cells, clockwise from red's entry. */
export const LUDO_PLAYER_COLORS = ["#e53935", "#43a047", "#fdd835", "#1e88e5"] as const;
export const LUDO_PLAYER_NAMES = ["Red", "Green", "Yellow", "Blue"] as const;

export { LUDO_SEEDS_PER_CORNER } from "@/lib/social-games/game-state-types";
export const LUDO_PATH: ReadonlyArray<readonly [number, number]> = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0],
];

/** Home columns (6 cells) leading into center — arrows point inward. */
export const LUDO_HOME_COLUMNS: ReadonlyArray<readonly [number, number][]> = [
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
];

/** 2×2 seed slots in each corner base (4 seeds per side). */
export const LUDO_YARDS: ReadonlyArray<readonly [number, number][]> = [
  [[2, 2], [2, 3], [3, 2], [3, 3]],
  [[2, 11], [2, 12], [3, 11], [3, 12]],
  [[11, 11], [11, 12], [12, 11], [12, 12]],
  [[11, 2], [11, 3], [12, 2], [12, 3]],
];

export const LUDO_HOME = -1;
export const LUDO_TRACK_LEN = 52;
export const LUDO_HOME_STRETCH = 6;

export function ludoStartSquare(seat: number): number {
  return seat * 13;
}

export function ludoFinishLine(seat: number): number {
  return ludoStartSquare(seat) + LUDO_TRACK_LEN;
}

export type LudoCellKind =
  | "empty"
  | "path"
  | "safe"
  | "yard"
  | "home-col"
  | "center";

export function ludoCellKind(row: number, col: number): LudoCellKind {
  if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return "center";
  if (LUDO_PATH.some(([r, c]) => r === row && c === col)) return "path";
  if (
    ([[6, 2], [8, 6], [12, 8], [8, 12]] as const).some(([r, c]) => r === row && c === col)
  ) {
    return "safe";
  }
  for (const column of LUDO_HOME_COLUMNS) {
    if (column.some(([r, c]) => r === row && c === col)) return "home-col";
  }
  for (const yard of LUDO_YARDS) {
    if (yard.some(([r, c]) => r === row && c === col)) return "yard";
  }
  return "empty";
}

export function ludoHomeColumnSeat(row: number, col: number): number | null {
  for (let seat = 0; seat < LUDO_HOME_COLUMNS.length; seat += 1) {
    if (LUDO_HOME_COLUMNS[seat]!.some(([r, c]) => r === row && c === col)) return seat;
  }
  return null;
}

export function ludoYardSeat(row: number, col: number): number | null {
  for (let seat = 0; seat < LUDO_YARDS.length; seat += 1) {
    if (LUDO_YARDS[seat]!.some(([r, c]) => r === row && c === col)) return seat;
  }
  return null;
}

export function ludoYardSlotIndex(row: number, col: number, homeSeat: number): number {
  const slots = LUDO_YARDS[homeSeat] ?? [];
  const index = slots.findIndex(([r, c]) => r === row && c === col);
  return index >= 0 ? index : 0;
}

/** Corner bases: Red TL, Green TR, Yellow BR, Blue BL. */
export function ludoBaseZoneSeat(row: number, col: number): number | null {
  if (row <= 5 && col <= 5) return 0;
  if (row <= 5 && col >= 9) return 1;
  if (row >= 9 && col >= 9) return 2;
  if (row >= 9 && col <= 5) return 3;
  return null;
}

/** Direction arrow on home-column cells (points toward center). */
export function ludoHomeColumnArrow(
  row: number,
  col: number,
  seat: number,
): "up" | "down" | "left" | "right" | null {
  const column = LUDO_HOME_COLUMNS[seat];
  if (!column?.some(([r, c]) => r === row && c === col)) return null;
  if (seat === 0) return "down";
  if (seat === 1) return "left";
  if (seat === 2) return "up";
  if (seat === 3) return "right";
  return null;
}

export function ludoPieceCoords(
  homeSeat: number,
  position: number,
  yardIndex: number,
): { row: number; col: number } {
  if (position === LUDO_HOME) {
    const slot = LUDO_YARDS[homeSeat]![yardIndex] ?? LUDO_YARDS[homeSeat]![0]!;
    return { row: slot[0], col: slot[1] };
  }

  const start = ludoStartSquare(homeSeat);
  const rel = position - start;
  const finish = ludoFinishLine(homeSeat);

  if (position >= finish || rel >= LUDO_TRACK_LEN) {
    return { row: 7, col: 7 };
  }

  if (rel >= LUDO_TRACK_LEN - LUDO_HOME_STRETCH) {
    const homeIdx = rel - (LUDO_TRACK_LEN - LUDO_HOME_STRETCH);
    const cell = LUDO_HOME_COLUMNS[homeSeat]![homeIdx] ?? LUDO_HOME_COLUMNS[homeSeat]![0]!;
    return { row: cell[0], col: cell[1] };
  }

  const pathIndex = position % LUDO_PATH.length;
  const pathCell = LUDO_PATH[pathIndex] ?? LUDO_PATH[0]!;
  return { row: pathCell[0], col: pathCell[1] };
}
