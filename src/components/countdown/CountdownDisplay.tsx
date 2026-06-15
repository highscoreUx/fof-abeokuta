"use client";

import { cn } from "@/lib/utils";
import { formatCountdownClock } from "@/lib/countdown/format";
import type { CountdownSessionState } from "@/lib/countdown/types";

interface CountdownDisplayProps {
  title: string;
  remainingMs: number;
  state: CountdownSessionState;
  variant?: "default" | "stage" | "compact";
}

export function CountdownDisplay({
  title,
  remainingMs,
  state,
  variant = "default",
}: CountdownDisplayProps) {
  const isStage = variant === "stage";
  const isCompact = variant === "compact";
  const isFinished = state === "FINISHED" || remainingMs <= 0;
  const isPaused = state === "PAUSED";

  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-center text-white",
        isStage ? "p-14" : isCompact ? "p-6" : "p-10",
      )}
    >
      <p
        className={cn(
          "uppercase tracking-widest opacity-80",
          isStage ? "text-base" : "text-xs",
        )}
      >
        {isFinished ? "Time's up" : isPaused ? "Paused" : "Countdown"}
      </p>
      <h2
        className={cn(
          "mt-2 font-black",
          isStage ? "text-4xl" : isCompact ? "text-xl" : "text-2xl",
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-4 font-mono font-bold tabular-nums",
          isStage ? "text-8xl" : isCompact ? "text-4xl" : "text-6xl",
          isFinished && "text-[#e21b3c]",
          isPaused && "opacity-70",
        )}
      >
        {formatCountdownClock(remainingMs)}
      </p>
    </div>
  );
}
