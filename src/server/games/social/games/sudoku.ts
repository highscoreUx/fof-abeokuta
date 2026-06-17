/** Preset Sudoku puzzles (81 chars, 0 = empty). */
const PUZZLES = [
  "530070000600195000098000060000060003406000007000020085000000000000000000000000000000",
  "000260701680070090190004500820100040004005006050008037009400074040720063701000000000",
  "800000000003600000070090200050007000000045600000100030001000068000500007005000000080",
  "000000907000420180000705026100201000047080280000605003920108000034059000507000000000",
  "020000000000000000000000000000000000000000000000000000000000000000000000000000000000",
];

export function pickSudokuPuzzle(): string {
  const index = Math.floor(Math.random() * PUZZLES.length);
  return PUZZLES[index]!;
}

export function solveSudoku(grid: string): string | null {
  const cells = grid.split("").map((c) => parseInt(c, 10));

  function valid(idx: number, n: number): boolean {
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    for (let i = 0; i < 9; i++) {
      if (cells[row * 9 + i] === n) return false;
      if (cells[i * 9 + col] === n) return false;
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (cells[(br + r) * 9 + bc + c] === n) return false;
      }
    }
    return true;
  }

  function solve(): boolean {
    const idx = cells.findIndex((v) => v === 0);
    if (idx === -1) return true;
    for (let n = 1; n <= 9; n++) {
      if (!valid(idx, n)) continue;
      cells[idx] = n;
      if (solve()) return true;
      cells[idx] = 0;
    }
    return false;
  }

  if (!solve()) return null;
  return cells.join("");
}

export function isSudokuComplete(grid: string, solution: string): boolean {
  if (grid.length !== 81 || solution.length !== 81) return false;
  for (let i = 0; i < 81; i++) {
    const g = grid[i]!;
    if (g === "0") return false;
    if (g !== solution[i]) return false;
  }
  return true;
}

export function normalizeSudokuGrid(grid: string): string {
  return grid
    .replace(/[^0-9]/g, "")
    .padEnd(81, "0")
    .slice(0, 81);
}

export interface SudokuState {
  puzzle: string;
  solution: string;
  boards: Record<string, string>;
  completedAt: Record<string, number>;
  startedAt: number;
}

export function createSudokuState(): SudokuState {
  const puzzle = pickSudokuPuzzle();
  const solution = solveSudoku(puzzle) ?? puzzle;
  return {
    puzzle,
    solution,
    boards: {},
    completedAt: {},
    startedAt: Date.now(),
  };
}

export function applySudokuCell(
  state: SudokuState,
  userId: string,
  index: number,
  value: number,
): { state: SudokuState; winnerUserId: string | null; error?: string } {
  if (index < 0 || index > 80) return { state, winnerUserId: null, error: "Invalid cell." };
  if (state.puzzle[index] !== "0") return { state, winnerUserId: null, error: "Cell is fixed." };
  if (value < 0 || value > 9) return { state, winnerUserId: null, error: "Invalid value." };

  const board = normalizeSudokuGrid(state.boards[userId] ?? state.puzzle);
  const next = board.split("");
  next[index] = String(value);
  const boards = { ...state.boards, [userId]: next.join("") };

  if (value !== 0 && parseInt(state.solution[index]!, 10) !== value) {
    return {
      state: { ...state, boards },
      winnerUserId: null,
      error: "Incorrect number.",
    };
  }

  const completedAt = { ...state.completedAt };
  let winnerUserId: string | null = null;
  if (isSudokuComplete(next.join(""), state.solution)) {
    completedAt[userId] = Date.now();
    winnerUserId = userId;
  }

  return {
    state: { ...state, boards, completedAt },
    winnerUserId,
  };
}
