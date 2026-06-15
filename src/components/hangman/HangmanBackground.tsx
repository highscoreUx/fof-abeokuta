"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HangmanBackgroundProps {
  children: ReactNode;
  className?: string;
}

export function HangmanBackground({ children, className }: HangmanBackgroundProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-[#190131] text-white",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-90"
        style={{ backgroundImage: "url(/hangman-bg.svg)" }}
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
