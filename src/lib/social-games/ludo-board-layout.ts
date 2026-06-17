/** Classic 15×15 Ludo board layout for rendering server piece positions. */

export const LUDO_GRID = 15;

export const LUDO_PLAYER_COLORS = ["#e53935", "#43a047", "#fdd835", "#1e88e5"] as const;

export const LUDO_PLAYER_NAMES = ["Red", "Green", "Yellow", "Blue"] as const;

/** 52 shared outer-track cells, clockwise from red's entry. */
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

/** Colored home columns (6 cells) leading into the center per seat. */
export const LUDO_HOME_COLUMNS: ReadonlyArray<readonly [number, number][]> = [
  [
    [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6],
  ],
  [
    [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
  ],
  [
    [7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8],
  ],
  [
    [13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7],
  ],
];

/** Yard slots for 4 tokens per player (at home). */
export const LUDO_YARDS: ReadonlyArray<readonly [number, number][]> = [
  [[10, 1], [10, 3], [11, 1], [11, 3]],
  [[1, 10], [1, 12], [3, 10], [3, 12]],
  [[1, 1], [1, 3], [3, 1], [3, 3]],
  [[10, 10], [10, 12], [12, 10], [12, 12]],
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

/** Tint full corner bases (classic Ludo home areas). */
export function ludoBaseZoneSeat(row: number, col: number): number | null {
  if (row >= 9 && col <= 5) return 0;
  if (row <= 5 && col >= 9) return 1;
  if (row <= 5 && col <= 5) return 2;
  if (row >= 9 && col >= 9) return 3;
  return null;
}

/** Map server position to board coordinates for a given seat. */
export function ludoPieceCoords(
  seat: number,
  position: number,
  pieceIndex: number,
): { row: number; col: number } {
  if (position === LUDO_HOME) {
    const slot = LUDO_YARDS[seat]![pieceIndex] ?? LUDO_YARDS[seat]![0]!;
    return { row: slot[0], col: slot[1] };
  }

  const start = ludoStartSquare(seat);
  const rel = position - start;
  const finish = ludoFinishLine(seat);

  if (position >= finish || rel >= LUDO_TRACK_LEN) {
    return { row: 7, col: 7 };
  }

  if (rel >= LUDO_TRACK_LEN - LUDO_HOME_STRETCH) {
    const homeIdx = rel - (LUDO_TRACK_LEN - LUDO_HOME_STRETCH);
    const cell = LUDO_HOME_COLUMNS[seat]![homeIdx] ?? LUDO_HOME_COLUMNS[seat]![0]!;
    return { row: cell[0], col: cell[1] };
  }

  const pathIndex = position % LUDO_PATH.length;
  const pathCell = LUDO_PATH[pathIndex] ?? LUDO_PATH[0]!;
  return { row: pathCell[0], col: pathCell[1] };
}
