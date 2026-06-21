/** Sudoku grids are always 81 digits (0 = empty). */
export function normalizeSudokuGrid(grid: string | null | undefined): string {
  return String(grid ?? "")
    .replace(/[^0-9]/g, "")
    .padEnd(81, "0")
    .slice(0, 81);
}

export function sudokuCellCoords(index: number): { row: number; col: number } {
  return { row: Math.floor(index / 9), col: index % 9 };
}

/** Thicker lines between 3×3 boxes (not on the outer edge). */
export function sudokuBoxBorderClass(index: number): string {
  const { row, col } = sudokuCellCoords(index);
  const classes: string[] = [];
  if (col % 3 === 0 && col > 0) classes.push("border-l-2 border-l-foreground/70");
  if (row % 3 === 0 && row > 0) classes.push("border-t-2 border-t-foreground/70");
  return classes.join(" ");
}

export function formatSudokuElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function emptySudokuPencils(): string[] {
  return Array.from({ length: 81 }, () => "");
}

export function toggleSudokuNote(notes: string, digit: number): string {
  if (digit === 0) return "";
  if (digit < 1 || digit > 9) return notes;
  const digits = new Set(notes.split("").filter(Boolean));
  const key = String(digit);
  if (digits.has(key)) digits.delete(key);
  else digits.add(key);
  return [...digits].sort().join("");
}

export function sudokuPencilsForUser(
  pencils: Record<string, string[]> | undefined,
  userId: string,
): string[] {
  const existing = pencils?.[userId];
  if (existing?.length === 81) return existing;
  return emptySudokuPencils();
}

export function removeSudokuNote(notes: string, digit: number): string {
  if (!notes || digit < 1 || digit > 9) return notes;
  const key = String(digit);
  return notes
    .split("")
    .filter((entry) => entry !== key)
    .join("");
}

/** Row, column, and box neighbors (excludes the cell itself). */
export function sudokuPeerIndices(index: number): number[] {
  const { row, col } = sudokuCellCoords(index);
  const peers = new Set<number>();
  for (let c = 0; c < 9; c += 1) peers.add(row * 9 + c);
  for (let r = 0; r < 9; r += 1) peers.add(r * 9 + col);
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) peers.add(r * 9 + c);
  }
  peers.delete(index);
  return [...peers];
}

export function sudokuSharesUnit(a: number, b: number): boolean {
  if (a === b) return true;
  const ac = sudokuCellCoords(a);
  const bc = sudokuCellCoords(b);
  if (ac.row === bc.row || ac.col === bc.col) return true;
  return Math.floor(ac.row / 3) === Math.floor(bc.row / 3) &&
    Math.floor(ac.col / 3) === Math.floor(bc.col / 3);
}

function markUnitConflicts(board: string, indices: number[], conflicts: Set<number>) {
  const byDigit = new Map<string, number[]>();
  for (const index of indices) {
    const value = board[index];
    if (!value || value === "0") continue;
    const list = byDigit.get(value) ?? [];
    list.push(index);
    byDigit.set(value, list);
  }
  for (const list of byDigit.values()) {
    if (list.length > 1) list.forEach((index) => conflicts.add(index));
  }
}

/** Indices of cells involved in a row, column, or box duplicate. */
export function sudokuConflictIndices(board: string): Set<number> {
  const normalized = normalizeSudokuGrid(board);
  const conflicts = new Set<number>();
  for (let row = 0; row < 9; row += 1) {
    markUnitConflicts(
      normalized,
      Array.from({ length: 9 }, (_, col) => row * 9 + col),
      conflicts,
    );
  }
  for (let col = 0; col < 9; col += 1) {
    markUnitConflicts(
      normalized,
      Array.from({ length: 9 }, (_, row) => row * 9 + col),
      conflicts,
    );
  }
  for (let boxRow = 0; boxRow < 9; boxRow += 3) {
    for (let boxCol = 0; boxCol < 9; boxCol += 3) {
      const indices: number[] = [];
      for (let r = boxRow; r < boxRow + 3; r += 1) {
        for (let c = boxCol; c < boxCol + 3; c += 1) indices.push(r * 9 + c);
      }
      markUnitConflicts(normalized, indices, conflicts);
    }
  }
  return conflicts;
}

/** How many originally empty cells the player has filled in. */
export function sudokuFillProgress(
  puzzle: string,
  board: string,
): { filled: number; total: number } {
  const p = normalizeSudokuGrid(puzzle);
  const b = normalizeSudokuGrid(board);
  let filled = 0;
  let total = 0;
  for (let i = 0; i < 81; i += 1) {
    if (p[i] === "0") {
      total += 1;
      if (b[i] !== "0") filled += 1;
    }
  }
  return { filled, total };
}

export function sudokuMoveSelection(
  selected: number | null,
  direction: "up" | "down" | "left" | "right",
  puzzle: string,
): number | null {
  if (selected == null) {
    const firstEditable = normalizeSudokuGrid(puzzle)
      .split("")
      .findIndex((cell) => cell === "0");
    return firstEditable >= 0 ? firstEditable : 0;
  }
  const { row, col } = sudokuCellCoords(selected);
  const next =
    direction === "up"
      ? { row: (row + 8) % 9, col }
      : direction === "down"
        ? { row: (row + 1) % 9, col }
        : direction === "left"
          ? { row, col: (col + 8) % 9 }
          : { row, col: (col + 1) % 9 };
  return next.row * 9 + next.col;
}
