"use client";

import { formatGraceCountdown } from "@/lib/activities/completion-grace";

export function CompletionGraceBanner({ remainingMs }: { remainingMs: number }) {
  if (remainingMs <= 0) return null;

  return (
    <p className="rounded-xl bg-muted/70 px-4 py-2 text-center text-sm text-muted-foreground">
      Results stay here for {formatGraceCountdown(remainingMs)}, then move to Completed.
    </p>
  );
}
