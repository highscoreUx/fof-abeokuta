"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { SudokuState } from "@/lib/social-games/game-state-types";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";
import {
  formatSudokuElapsed,
  normalizeSudokuGrid,
  sudokuBoxBorderClass,
  sudokuPencilsForUser,
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
  const finished = snapshot.status === "FINISHED";

  const startedAt = game.startedAt ?? snapshot.serverNow;
  const myFinishAt = user?.id ? game.completedAt[user.id] : undefined;

  useEffect(() => {
    if (finished && myFinishAt != null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [finished, myFinishAt]);

  const elapsedMs = finished && myFinishAt != null ? myFinishAt - startedAt : now - startedAt;

  const applyNumber = (value: number) => {
    if (selected == null || finished) return;
    if (pencilMode) {
      sendMove("pencil", { index: selected, value });
      return;
    }
    sendMove("cell", { index: selected, value });
    if (value !== 0) setSelected(null);
  };

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

      <div className="mx-auto w-full max-w-[18rem]">
        <div className="grid aspect-square w-full grid-cols-9 grid-rows-9 gap-px rounded-lg border-2 border-foreground/80 bg-foreground/80 p-px">
          {Array.from({ length: 81 }, (_, index) => {
            const cell = myBoard[index] ?? "0";
            const fixed = puzzle[index] !== "0";
            const selectedCell = selected === index;
            const notes = cell === "0" ? (myPencils[index] ?? "") : "";
            return (
              <button
                key={index}
                type="button"
                disabled={finished || fixed}
                onClick={() => !fixed && setSelected(index)}
                className={`relative flex h-full min-h-0 w-full min-w-0 items-center justify-center text-sm font-medium sm:text-base ${
                  fixed ? "bg-muted font-semibold text-foreground" : "bg-card"
                } ${sudokuBoxBorderClass(index)} ${selectedCell ? "ring-2 ring-inset ring-primary" : ""}`}
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
          ? "Pencil mode — tap numbers to add or remove small notes in the selected cell."
          : "Tap a cell, then pick a number. Wrong entries stay until you fix them."}
      </p>
    </Card>
  );
}
