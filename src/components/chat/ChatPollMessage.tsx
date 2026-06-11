"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { getPollStats, parsePollBody } from "@/lib/chat-poll";
import { cn } from "@/lib/cn";
import { useChatStore } from "@/stores/chatStore";

interface ChatPollMessageProps {
  messageId: string;
  body: string;
  roomId: string;
  className?: string;
}

export function ChatPollMessage({ messageId, body, roomId, className }: ChatPollMessageProps) {
  const { api } = useEventApi();
  const { user } = useAuth();
  const upsertMessage = useChatStore((s) => s.upsertMessage);
  const [voting, setVoting] = useState(false);

  const poll = parsePollBody(body);
  if (!poll) return null;

  const stats = getPollStats(poll, user?.id);
  const showResults = stats.hasVoted;
  const isPending = messageId.startsWith("pending-");

  const vote = async (optionIndex: number) => {
    if (!user || voting || isPending || stats.userVote === optionIndex) return;

    setVoting(true);
    try {
      const data = await api<{ message: { id: string; body: string; createdAt: string; teamId?: string; user: { username: string; firstName: string; lastName: string } } }>(
        `/chat/polls/${messageId}/vote`,
        {
          method: "POST",
          body: JSON.stringify({ optionIndex }),
        },
      );
      upsertMessage(roomId, data.message);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className={cn("min-w-[14rem]", className)}>
      <p className="mb-2 text-[14px] font-semibold leading-snug text-foreground">
        📊 {poll.question}
      </p>

      <ul className="space-y-1.5">
        {poll.options.map((option, index) => {
          const isSelected = stats.userVote === index;
          const count = stats.counts[index] ?? 0;
          const percent = stats.percents[index] ?? 0;

          return (
            <li key={`${messageId}-${index}`}>
              <button
                type="button"
                disabled={voting || isPending}
                onClick={() => void vote(index)}
                className={cn(
                  "relative w-full overflow-hidden rounded-lg border text-left transition",
                  showResults
                    ? "border-border bg-muted/40"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
                  isSelected && "border-primary/50 ring-1 ring-primary/20",
                  voting && "opacity-70",
                )}
              >
                {showResults && (
                  <span
                    className="absolute inset-y-0 left-0 bg-primary/15 transition-all"
                    style={{ width: `${percent}%` }}
                    aria-hidden
                  />
                )}
                <span className="relative flex items-center justify-between gap-2 px-2.5 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                      aria-hidden
                    >
                      {isSelected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </span>
                    <span className="text-[13px] text-foreground">{option}</span>
                  </span>
                  {showResults && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {percent}% ({count})
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {stats.total} vote{stats.total === 1 ? "" : "s"}
        {!stats.hasVoted && " · Tap an option to vote"}
      </p>
    </div>
  );
}
