"use client";

import type { ChatParticipant } from "@/types/chat";
import { cn } from "@/lib/cn";

interface ChatMentionMenuProps {
  candidates: ChatParticipant[];
  activeIndex: number;
  className?: string;
  onSelect: (participant: ChatParticipant) => void;
  onHover: (index: number) => void;
}

export function ChatMentionMenu({
  candidates,
  activeIndex,
  className,
  onSelect,
  onHover,
}: ChatMentionMenuProps) {
  if (candidates.length === 0) return null;

  return (
    <div
      className={cn(
        "max-h-48 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg",
        className,
      )}
      role="listbox"
      aria-label="Mention someone"
    >
      {candidates.map((participant, index) => (
        <button
          key={participant.id}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(participant);
          }}
          onMouseEnter={() => onHover(index)}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition",
            index === activeIndex ? "bg-muted text-foreground" : "text-foreground hover:bg-muted/70",
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            {participant.firstName.charAt(0)}
            {participant.lastName.charAt(0)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">
              {participant.firstName} {participant.lastName}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              @{participant.username}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
