"use client";

import { cn } from "@/lib/utils";

interface HangmanFigureProps {
  wrongCount: number;
  maxWrong: number;
  className?: string;
}

/** Draws gallows + body parts for 0..maxWrong incorrect guesses. */
export function HangmanFigure({ wrongCount, maxWrong, className }: HangmanFigureProps) {
  const stage = Math.min(wrongCount, maxWrong);

  return (
    <svg
      viewBox="0 0 200 220"
      className={cn("h-40 w-36 sm:h-48 sm:w-44", className)}
      aria-label={`${stage} of ${maxWrong} wrong guesses`}
    >
      <g stroke="#5DA9EF" strokeWidth="4" fill="none" strokeLinecap="round">
        <line x1="20" y1="210" x2="180" y2="210" />
        <line x1="60" y1="210" x2="60" y2="20" />
        <line x1="60" y1="20" x2="140" y2="20" />
        <line x1="140" y1="20" x2="140" y2="45" />
      </g>
      {stage >= 1 && (
        <circle cx="140" cy="60" r="15" stroke="#FF6B9D" strokeWidth="4" fill="none" />
      )}
      {stage >= 2 && (
        <line x1="140" y1="75" x2="140" y2="130" stroke="#FF6B9D" strokeWidth="4" />
      )}
      {stage >= 3 && (
        <line x1="140" y1="90" x2="110" y2="110" stroke="#FF6B9D" strokeWidth="4" />
      )}
      {stage >= 4 && (
        <line x1="140" y1="90" x2="170" y2="110" stroke="#FF6B9D" strokeWidth="4" />
      )}
      {stage >= 5 && (
        <line x1="140" y1="130" x2="115" y2="165" stroke="#FF6B9D" strokeWidth="4" />
      )}
      {stage >= 6 && (
        <line x1="140" y1="130" x2="165" y2="165" stroke="#FF6B9D" strokeWidth="4" />
      )}
    </svg>
  );
}
