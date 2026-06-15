"use client";

import { HANGMAN_ALPHABET } from "@/lib/hangman/types";
import { cn } from "@/lib/utils";

interface HangmanKeyboardProps {
  guessedLetters: string[];
  disabled?: boolean;
  highlightLetter?: string | null;
  onLetterClick?: (letter: string) => void;
}

export function HangmanKeyboard({
  guessedLetters,
  disabled = false,
  highlightLetter,
  onLetterClick,
}: HangmanKeyboardProps) {
  const guessed = new Set(guessedLetters.map((l) => l.toUpperCase()));

  return (
    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
      {HANGMAN_ALPHABET.map((letter) => {
        const used = guessed.has(letter);
        const highlighted = highlightLetter?.toUpperCase() === letter;
        return (
          <button
            key={letter}
            type="button"
            disabled={disabled || used || !onLetterClick}
            onClick={() => onLetterClick?.(letter)}
            className={cn(
              "flex h-9 w-8 items-center justify-center rounded-lg text-sm font-bold transition sm:h-10 sm:w-9 sm:text-base",
              used
                ? "cursor-not-allowed bg-white/10 text-white/30"
                : highlighted
                  ? "bg-[#FF6B9D] text-white ring-2 ring-white/50"
                  : "bg-white/15 text-white hover:bg-[#5DA9EF]/40 hover:text-white",
              disabled && !used && "opacity-60",
            )}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
