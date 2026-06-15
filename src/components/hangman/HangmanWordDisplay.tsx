"use client";

import { formatWordMaskDisplay } from "@/lib/hangman/types";
import { cn } from "@/lib/utils";

interface HangmanWordDisplayProps {
  wordMask: string;
  className?: string;
}

export function HangmanWordDisplay({ wordMask, className }: HangmanWordDisplayProps) {
  const display = formatWordMaskDisplay(wordMask);

  return (
    <p
      className={cn(
        "text-center font-mono text-2xl font-black tracking-[0.35em] text-white sm:text-3xl md:text-4xl",
        className,
      )}
    >
      {display}
    </p>
  );
}
