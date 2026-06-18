"use client";

import type { TicTacToeCell, TicTacToeMark } from "@/lib/tic-tac-toe/types";

interface TicTacToeBoardProps {
  board: TicTacToeCell[];
  currentTurn?: TicTacToeMark;
  teamXColor?: string;
  teamOColor?: string;
  disabled?: boolean;
  highlightCell?: number | null;
  pendingCellIndex?: number | null;
  onCellClick?: (index: number) => void;
}

export function TicTacToeBoard({
  board,
  currentTurn,
  teamXColor = "#2563eb",
  teamOColor = "#dc2626",
  disabled = false,
  highlightCell = null,
  pendingCellIndex = null,
  onCellClick,
}: TicTacToeBoardProps) {
  return (
    <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-2">
      {board.map((cell, index) => {
        const isEmpty = cell === null;
        const color = cell === "X" ? teamXColor : cell === "O" ? teamOColor : undefined;
        const isPending = pendingCellIndex === index;
        const canClick = !disabled && isEmpty && onCellClick && !isPending;

        return (
          <button
            key={index}
            type="button"
            disabled={!canClick}
            onClick={() => onCellClick?.(index)}
            className={`flex aspect-square items-center justify-center rounded-xl border-2 text-3xl font-bold transition ${
              highlightCell === index
                ? "border-primary bg-primary/10"
                : isPending
                  ? "border-primary/40 bg-primary/10 opacity-80"
                  : "border-border bg-card"
            } ${canClick ? "cursor-pointer hover:border-primary/50 hover:bg-primary/5" : "cursor-default"}`}
            style={color ? { color } : undefined}
            aria-label={cell ? `Cell ${index + 1}: ${cell}` : `Cell ${index + 1}: empty`}
          >
            {cell === "X" ? "X" : cell === "O" ? "O" : null}
          </button>
        );
      })}
    </div>
  );
}
