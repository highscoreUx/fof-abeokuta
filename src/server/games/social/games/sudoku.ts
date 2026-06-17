import {
  normalizeSudokuGrid,
  removeSudokuNote,
  sudokuPencilsForUser,
  sudokuPeerIndices,
  toggleSudokuNote,
} from "@/lib/social-games/sudoku-grid";

/** Preset Sudoku puzzles (81 chars, 0 = empty). */
const PUZZLES = [
  "530070000600195000098000060000060003406000007000020085000000000000000000000000000",
  "000260701680070090190004500820100040004005006050008037009400074040720063701000000",
  "800000000003600000070090200050007000000045600000100030001000068000500007005000000",
  "000000907000420180000705026100201000047080280000605003920108000034059000507000000",
  "020000000000000000000000000000000000000000000000000000000000000000000000000000",
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
  const normalized = normalizeSudokuGrid(grid);
  const answer = normalizeSudokuGrid(solution);
  for (let i = 0; i < 81; i++) {
    const g = normalized[i]!;
    if (g === "0") return false;
    if (g !== answer[i]) return false;
  }
  return true;
}

export { normalizeSudokuGrid } from "@/lib/social-games/sudoku-grid";

export interface SudokuState {
  puzzle: string;
  solution: string;
  boards: Record<string, string>;
  pencils?: Record<string, string[]>;
  completedAt: Record<string, number>;
  startedAt: number;
}

export function createSudokuState(): SudokuState {
  const puzzle = normalizeSudokuGrid(pickSudokuPuzzle());
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
  if (value < 0 || value > 9) return { state, winnerUserId: null, error: "Invalid value." };

  const puzzle = normalizeSudokuGrid(state.puzzle);
  if (puzzle[index] !== "0") return { state, winnerUserId: null, error: "Cell is fixed." };

  const board = normalizeSudokuGrid(state.boards[userId] ?? puzzle);
  const next = board.split("");
  next[index] = String(value);
  const boards = { ...state.boards, [userId]: next.join("") };

  const pencilRows = sudokuPencilsForUser(state.pencils, userId);
  const nextPencils = [...pencilRows];
  nextPencils[index] = value === 0 ? nextPencils[index] : "";
  if (value >= 1 && value <= 9) {
    for (const peerIndex of sudokuPeerIndices(index)) {
      nextPencils[peerIndex] = removeSudokuNote(nextPencils[peerIndex] ?? "", value);
    }
  }
  const pencils = { ...state.pencils, [userId]: nextPencils };

  const completedAt = { ...state.completedAt };
  let winnerUserId: string | null = null;
  if (value !== 0 && isSudokuComplete(next.join(""), normalizeSudokuGrid(state.solution))) {
    completedAt[userId] = Date.now();
    winnerUserId = userId;
  }

  return {
    state: { ...state, boards, pencils, completedAt },
    winnerUserId,
  };
}

export function applySudokuPencil(
  state: SudokuState,
  userId: string,
  index: number,
  digit: number,
): { state: SudokuState; error?: string } {
  if (index < 0 || index > 80) return { state, error: "Invalid cell." };
  if (digit < 0 || digit > 9) return { state, error: "Invalid value." };

  const puzzle = normalizeSudokuGrid(state.puzzle);
  if (puzzle[index] !== "0") return { state, error: "Cell is fixed." };

  const board = normalizeSudokuGrid(state.boards[userId] ?? puzzle);
  if (board[index] !== "0") return { state, error: "Clear the cell before editing notes." };

  const pencilRows = sudokuPencilsForUser(state.pencils, userId);
  const nextPencils = [...pencilRows];
  nextPencils[index] = toggleSudokuNote(pencilRows[index] ?? "", digit);
  const pencils = { ...state.pencils, [userId]: nextPencils };

  return { state: { ...state, pencils } };
}
