/** Sudoku grids are always 81 digits (0 = empty). */
export function normalizeSudokuGrid(grid: string): string {
  return grid
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
