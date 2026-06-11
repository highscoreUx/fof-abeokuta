"use client";

import { formatTypingLabel, type ChatTyper } from "@/lib/chat-typing";
import { cn } from "@/lib/cn";

interface TypingIndicatorProps {
  typers: ChatTyper[];
  className?: string;
}

export function TypingIndicator({ typers, className }: TypingIndicatorProps) {
  const label = formatTypingLabel(typers);
  if (!label) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-1 text-xs text-muted-foreground",
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="flex items-center gap-0.5" aria-hidden>
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:0ms]" />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:150ms]" />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:300ms]" />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}
