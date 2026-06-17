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
