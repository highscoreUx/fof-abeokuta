"use client";

import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/kahoot-ui";
import type { QuizStateSnapshot } from "@/types";

export function QuizLeaderboardList({
  entries,
  highlightUserId,
  compact = false,
}: {
  entries: QuizStateSnapshot["leaderboard"];
  highlightUserId?: string;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      {entries.slice(0, compact ? 5 : 10).map((entry) => (
        <div
          key={entry.userId}
          className={cn(
            "flex items-center justify-between rounded-xl px-4 py-3",
            entry.userId === highlightUserId
              ? "bg-primary/15 ring-2 ring-primary"
              : "bg-foreground/5",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="w-8 text-lg font-black text-muted-foreground">#{entry.rank}</span>
            <div>
              <p className="font-semibold">{entry.username}</p>
              {!compact && (
                <p className="text-xs text-muted-foreground">
                  {entry.accuracy}% accuracy · streak {entry.streak}
                </p>
              )}
            </div>
          </div>
          <span className="text-lg font-black">{formatPoints(entry.totalPoints)}</span>
        </div>
      ))}
    </div>
  );
}

export function QuizFinishedResults({
  state,
  highlightUserId,
  banner,
}: {
  state: QuizStateSnapshot;
  highlightUserId?: string;
  banner?: React.ReactNode;
}) {
  const myRank = state.leaderboard.find((entry) => entry.userId === highlightUserId);

  return (
    <div className="space-y-4">
      {banner}
      <div className="rounded-2xl bg-gradient-to-br from-[#46178f] to-[#26890c] p-8 text-center text-white">
        <p className="text-sm uppercase tracking-widest opacity-80">Final standings</p>
        <h2 className="mt-2 text-3xl font-black">{state.quizTitle ?? "Live Trivia"}</h2>
        {myRank && (
          <p className="mt-4 text-xl">
            You placed <strong>#{myRank.rank}</strong> with {formatPoints(myRank.totalPoints)} pts
          </p>
        )}
      </div>
      <QuizLeaderboardList entries={state.leaderboard} highlightUserId={highlightUserId} />
    </div>
  );
}
