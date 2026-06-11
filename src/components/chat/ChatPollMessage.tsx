"use client";

import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { getSocket, isSocketConnected, useSocket } from "@/hooks/useSocket";
import {
  formatPollTimeRemaining,
  getPollStats,
  isPollExpired,
  parsePollBody,
} from "@/lib/chat-poll";
import { cn } from "@/lib/cn";
import { EMPTY_CHAT_MESSAGES, useChatStore } from "@/stores/chatStore";
import type { ChatMessage } from "@/types/chat";

interface ChatPollMessageProps {
  messageId: string;
  body: string;
  roomId: string;
  className?: string;
}

type VoteAck = { message?: ChatMessage; error?: string };

export function ChatPollMessage({ messageId, body, roomId, className }: ChatPollMessageProps) {
  const { api } = useEventApi();
  const { user } = useAuth();
  const socket = useSocket();
  const upsertMessage = useChatStore((s) => s.upsertMessage);
  const liveBody = useChatStore(
    (s) =>
      (s.messagesByRoom[roomId] ?? EMPTY_CHAT_MESSAGES).find((m) => m.id === messageId)?.body ??
      body,
  );
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [optimisticVote, setOptimisticVote] = useState<number | null>(null);
  const votingRef = useRef(false);

  const poll = useMemo(() => parsePollBody(liveBody), [liveBody]);
  if (!poll) return null;

  const stats = getPollStats(poll, user?.id);
  const isPending = messageId.startsWith("pending-");
  const expired = isPollExpired(poll);
  const canSwitch = poll.allowVoteSwitching === true;
  const activeVote = stats.hasVoted ? stats.userVote : optimisticVote;
  const showResults = stats.total > 0 || stats.hasVoted || optimisticVote !== null;
  const timeRemaining = formatPollTimeRemaining(poll);

  const voteViaApi = async (optionIndex: number) => {
    const data = await api<{ message: ChatMessage }>(`/chat/polls/${messageId}/vote`, {
      method: "POST",
      body: JSON.stringify({ optionIndex }),
    });
    upsertMessage(roomId, data.message);
  };

  const vote = async (optionIndex: number) => {
    if (!user || votingRef.current || isPending || expired) return;
    if (stats.hasVoted && !canSwitch) return;
    if (activeVote === optionIndex) return;

    votingRef.current = true;
    setVoting(true);
    setVoteError(null);
    setOptimisticVote(optionIndex);

    try {
      const activeSocket = socket ?? getSocket();

      if (activeSocket && isSocketConnected()) {
        await new Promise<void>((resolve, reject) => {
          activeSocket
            .timeout(8000)
            .emit(
              "poll:vote",
              { messageId, optionIndex },
              (error: Error | null, response?: VoteAck) => {
                if (error || response?.error || !response?.message) {
                  void voteViaApi(optionIndex).then(() => resolve()).catch(reject);
                  return;
                }
                upsertMessage(roomId, response.message!);
                resolve();
              },
            );
        });
      } else {
        await voteViaApi(optionIndex);
      }

      setOptimisticVote(null);
    } catch (error) {
      setOptimisticVote(null);
      setVoteError(error instanceof Error ? error.message : "Could not record vote");
    } finally {
      votingRef.current = false;
      setVoting(false);
    }
  };

  const locked = isPending || voting || expired || (stats.hasVoted && !canSwitch);

  return (
    <div className={cn("max-w-full", className)}>
      <p className="mb-2 text-[14px] font-semibold leading-snug text-foreground">
        📊 {poll.question}
      </p>

      {poll.expiresAt && (
        <p className="mb-2 text-[11px] text-muted-foreground">
          {expired
            ? "Poll ended"
            : timeRemaining
              ? `Ends in ${timeRemaining}`
              : "Ending soon"}
        </p>
      )}

      <ul className="space-y-1.5">
        {poll.options.map((option, index) => {
          const isSelected = activeVote === index;
          const count = stats.counts[index] ?? 0;
          const percent = stats.percents[index] ?? 0;

          return (
            <li key={`${messageId}-${index}`}>
              <button
                type="button"
                disabled={locked}
                onClick={() => void vote(index)}
                className={cn(
                  "relative w-full overflow-hidden rounded-lg border text-left transition",
                  locked && !isSelected && "cursor-default opacity-80",
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
        {expired && " · Poll closed"}
        {!expired && !stats.hasVoted && !isPending && !voting && " · Tap an option to vote"}
        {!expired && stats.hasVoted && canSwitch && " · Tap another option to change your vote"}
        {!expired && stats.hasVoted && !canSwitch && " · You voted"}
        {voting && !stats.hasVoted && " · Recording vote…"}
        {isPending && " · Sending poll…"}
      </p>
      {voteError && (
        <p className="mt-1 text-[11px] text-danger">{voteError}</p>
      )}
    </div>
  );
}
