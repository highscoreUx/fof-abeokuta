"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { SudokuState } from "@/lib/social-games/game-state-types";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";
import {
  formatSudokuElapsed,
  normalizeSudokuGrid,
  sudokuBoxBorderClass,
  sudokuCellCoords,
  sudokuConflictIndices,
  sudokuFillProgress,
  sudokuMoveSelection,
  sudokuPencilsForUser,
  sudokuSharesUnit,
} from "@/lib/social-games/sudoku-grid";

function playerName(snapshot: SocialGameMatchSnapshot, userId: string | null | undefined) {
  if (!userId) return "Player";
  const player = snapshot.players.find((entry) => entry.userId === userId);
  return player?.firstName ?? "Player";
}

function SudokuNotes({ notes }: { notes: string }) {
  if (!notes) return null;
  const marked = new Set(notes.split(""));
  return (
    <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 p-0.5 text-[6px] leading-none text-muted-foreground sm:text-[7px]">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
        <span key={digit} className="flex items-center justify-center font-medium">
          {marked.has(String(digit)) ? digit : ""}
        </span>
      ))}
    </div>
  );
}

function cellHighlightClass({
  isSelected,
  isPeer,
  isSameNumber,
  isConflict,
  fixed,
}: {
  isSelected: boolean;
  isPeer: boolean;
  isSameNumber: boolean;
  isConflict: boolean;
  fixed: boolean;
}): string {
  if (isConflict) {
    return fixed
      ? "bg-red-200 font-semibold text-red-900"
      : "bg-red-100 font-medium text-red-800";
  }
  if (isSelected) return "bg-primary/20 font-semibold text-foreground ring-2 ring-inset ring-primary";
  if (isSameNumber) return "bg-amber-100 font-medium text-amber-950";
  if (isPeer) return "bg-primary/10";
  if (fixed) return "bg-muted font-semibold text-foreground";
  return "bg-card";
}

export function SudokuLive({
  snapshot,
  sendMove,
}: {
  snapshot: SocialGameMatchSnapshot;
  sendMove: (action: string, payload?: Record<string, unknown>) => void;
}) {
  const { user } = useAuth();
  const game = snapshot.state as SudokuState;
  const puzzle = useMemo(() => normalizeSudokuGrid(game.puzzle), [game.puzzle]);
  const myBoard = useMemo(() => {
    const raw = user?.id ? (game.boards[user.id] ?? puzzle) : puzzle;
    return normalizeSudokuGrid(raw);
  }, [game.boards, puzzle, user?.id]);
  const myPencils = useMemo(
    () => (user?.id ? sudokuPencilsForUser(game.pencils, user.id) : []),
    [game.pencils, user?.id],
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [pencilMode, setPencilMode] = useState(false);
  const [now, setNow] = useState(() => snapshot.serverNow);
  const gridRef = useRef<HTMLDivElement>(null);
  const finished = snapshot.status === "FINISHED";

  const startedAt = game.startedAt ?? snapshot.serverNow;
  const myFinishAt = user?.id ? game.completedAt[user.id] : undefined;

  const conflicts = useMemo(() => sudokuConflictIndices(myBoard), [myBoard]);
  const myProgress = useMemo(() => sudokuFillProgress(puzzle, myBoard), [puzzle, myBoard]);

  const opponentProgress = useMemo(() => {
    return snapshot.players
      .filter((player) => player.userId !== user?.id)
      .map((player) => {
        const board = normalizeSudokuGrid(game.boards[player.userId] ?? puzzle);
        return {
          userId: player.userId,
          name: player.firstName,
          ...sudokuFillProgress(puzzle, board),
        };
      });
  }, [snapshot.players, user?.id, game.boards, puzzle]);

  const selectedValue =
    selected != null && myBoard[selected] !== "0" ? myBoard[selected]! : null;

  useEffect(() => {
    if (finished && myFinishAt != null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [finished, myFinishAt]);

  const elapsedMs = finished && myFinishAt != null ? myFinishAt - startedAt : now - startedAt;

  const applyNumber = useCallback(
    (value: number) => {
      if (selected == null || finished) return;
      if (puzzle[selected] !== "0") return;
      if (pencilMode) {
        sendMove("pencil", { index: selected, value });
        return;
      }
      sendMove("cell", { index: selected, value });
    },
    [selected, finished, puzzle, pencilMode, sendMove],
  );

  const selectCell = useCallback(
    (index: number) => {
      if (finished) return;
      setSelected(index);
      gridRef.current?.focus();
    },
    [finished],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (finished) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        setPencilMode((on) => !on);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((current) => sudokuMoveSelection(current, "up", puzzle));
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((current) => sudokuMoveSelection(current, "down", puzzle));
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelected((current) => sudokuMoveSelection(current, "left", puzzle));
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelected((current) => sudokuMoveSelection(current, "right", puzzle));
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        event.preventDefault();
        applyNumber(0);
        return;
      }

      const digit = Number(event.key);
      if (digit >= 1 && digit <= 9) {
        event.preventDefault();
        applyNumber(digit);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finished, puzzle, applyNumber]);

  const progressPercent =
    myProgress.total > 0 ? Math.round((myProgress.filled / myProgress.total) * 100) : 0;

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">
          {finished
            ? snapshot.winnerUserId
              ? `${playerName(snapshot, snapshot.winnerUserId)} finished first`
              : "Puzzle complete"
            : "Race — first correct completion wins"}
        </CardTitle>
        <p className="font-mono text-sm tabular-nums text-muted-foreground">
          {formatSudokuElapsed(elapsedMs)}
        </p>
      </div>

      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Your progress</span>
          <span className="font-medium tabular-nums text-foreground">
            {myProgress.filled}/{myProgress.total} ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {opponentProgress.length > 0 && (
        <div className="mb-4 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">Opponent progress</p>
          {opponentProgress.map((entry) => {
            const percent =
              entry.total > 0 ? Math.round((entry.filled / entry.total) * 100) : 0;
            return (
              <div key={entry.userId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{entry.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {entry.filled}/{entry.total}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-secondary transition-[width] duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label="Sudoku board"
        className="mx-auto w-full max-w-[18rem] outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
      >
        <div className="grid aspect-square w-full grid-cols-9 grid-rows-9 gap-px rounded-lg border-2 border-foreground/80 bg-foreground/80 p-px">
          {Array.from({ length: 81 }, (_, index) => {
            const cell = myBoard[index] ?? "0";
            const fixed = puzzle[index] !== "0";
            const isSelected = selected === index;
            const isPeer = selected != null && sudokuSharesUnit(selected, index) && !isSelected;
            const isSameNumber =
              selectedValue != null && cell !== "0" && cell === selectedValue;
            const isConflict = conflicts.has(index);
            const notes = cell === "0" ? (myPencils[index] ?? "") : "";
            const { row, col } = sudokuCellCoords(index);

            return (
              <button
                key={index}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-label={`Row ${row + 1} column ${col + 1}${cell !== "0" ? `, ${cell}` : ""}`}
                disabled={finished}
                onClick={() => selectCell(index)}
                className={`relative flex h-full min-h-0 w-full min-w-0 items-center justify-center text-sm font-medium transition-colors sm:text-base ${sudokuBoxBorderClass(index)} ${cellHighlightClass({
                  isSelected,
                  isPeer,
                  isSameNumber,
                  isConflict,
                  fixed,
                })}`}
              >
                {cell !== "0" ? cell : <SudokuNotes notes={notes} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={pencilMode ? "primary" : "outline"}
          disabled={finished}
          onClick={() => setPencilMode((on) => !on)}
        >
          {pencilMode ? "Pencil on" : "Pencil"}
        </Button>
      </div>

      {selected != null && !finished && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
            <Button key={value} size="sm" variant="outline" onClick={() => applyNumber(value)}>
              {value}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => applyNumber(0)}>
            {pencilMode ? "Clear notes" : "Clear"}
          </Button>
        </div>
      )}

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {pencilMode
          ? "Pencil mode — notes auto-update when you place numbers. Space toggles pencil."
          : "Arrow keys move · 1–9 enter · Space = pencil · Duplicates highlight in red."}
      </p>
    </Card>
  );
}
