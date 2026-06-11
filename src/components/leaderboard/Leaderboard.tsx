"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { Card, CardTitle } from "@/components/ui/card";
import type { LeaderboardEntry } from "@/types";

export function Leaderboard({ type = "competition" }: { type?: "competition" | "quiz" }) {
  const { slug, api } = useEventApi();
  const socket = useSocket();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [prevRanks, setPrevRanks] = useState<Record<string, number>>({});

  const load = () => {
    api<{ leaderboard: LeaderboardEntry[] }>(`/leaderboard?type=${type}`).then((d) => {
      setEntries((prev) => {
        const ranks: Record<string, number> = {};
        prev.forEach((e) => {
          ranks[e.teamId ?? e.teamLetter] = e.rank;
        });
        setPrevRanks(ranks);
        return d.leaderboard;
      });
    });
  };

  useEffect(() => {
    load();
  }, [slug, type]);

  useEffect(() => {
    if (!socket) return;
    socket.on("leaderboard:update", setEntries);
    return () => {
      socket.off("leaderboard:update");
    };
  }, [socket]);

  return (
    <Card>
      <CardTitle>Leaderboard</CardTitle>
      <div className="mt-4 space-y-2">
        {entries.map((entry) => {
          const key = entry.teamId ?? entry.teamLetter;
          const prevRank = prevRanks[key];
          const moved = prevRank && prevRank !== entry.rank;

          return (
            <div
              key={key}
              className={`flex items-center justify-between rounded-lg bg-muted p-3 transition-all duration-700 ${
                moved ? "scale-[1.02] ring-2 ring-primary/30" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {entry.rank}
                </span>
                <div>
                  <p className="font-medium">Team {entry.teamLetter}</p>
                  <p className="text-xs text-muted-foreground">{entry.judgeCount} judges scored</p>
                </div>
              </div>
              <p className="font-bold">{entry.averageScore ?? entry.totalPoints}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
