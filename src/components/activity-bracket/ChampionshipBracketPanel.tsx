"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { Card } from "@/components/ui/card";
import type { ActivityBracketSnapshot } from "@/lib/activity-bracket/types";

interface ChampionshipBracketPanelProps {
  challengeId: string;
  gameType: "tic_tac_toe" | "hangman";
  initialBracket?: ActivityBracketSnapshot | null;
}

export function ChampionshipBracketPanel({
  challengeId,
  gameType,
  initialBracket = null,
}: ChampionshipBracketPanelProps) {
  const socket = useSocket();
  const [bracket, setBracket] = useState<ActivityBracketSnapshot | null>(initialBracket);

  useEffect(() => {
    if (!socket) return;

    const onState = (snapshot: ActivityBracketSnapshot) => {
      if (snapshot.challengeId !== challengeId || snapshot.gameType !== gameType) return;
      setBracket(snapshot);
    };

    socket.on("bracket:state", onState);
    return () => {
      socket.off("bracket:state", onState);
    };
  }, [socket, challengeId, gameType]);

  if (!bracket || bracket.state === "SETUP") {
    return null;
  }

  const currentRound = bracket.rounds.find((r) => r.roundNumber === bracket.currentRound);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Championship bracket</p>
          <p className="text-xs text-muted-foreground">
            Race to {bracket.targetWins} win{bracket.targetWins === 1 ? "" : "s"} per matchup
            {bracket.state === "FINISHED" && bracket.championTeam
              ? ` · Champion: Team ${bracket.championTeam.letter}`
              : ` · Round ${bracket.currentRound}`}
          </p>
        </div>
        {bracket.state === "ACTIVE" && (
          <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
            Live
          </span>
        )}
      </div>

      {currentRound && (
        <ul className="mt-4 space-y-2">
          {currentRound.slots.map((slot) => (
            <li
              key={slot.slotId}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            >
              {slot.isBye ? (
                <span>
                  Team {slot.teamA.letter}{" "}
                  <span className="text-muted-foreground">· Bye to next round</span>
                </span>
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  <span style={{ color: slot.teamA.color }}>{slot.teamA.letter}</span>
                  <span className="font-mono font-semibold">
                    {slot.teamAWins} – {slot.teamBWins}
                  </span>
                  <span style={{ color: slot.teamB?.color }}>{slot.teamB?.letter}</span>
                  {slot.state === "COMPLETE" && slot.winnerTeamId && (
                    <span className="text-muted-foreground">
                      ·{" "}
                      {slot.winnerTeamId === slot.teamA.id
                        ? `Team ${slot.teamA.letter} advances`
                        : `Team ${slot.teamB?.letter} advances`}
                    </span>
                  )}
                  {slot.activeMatchId && slot.state === "ACTIVE" && (
                    <span className="text-muted-foreground">· Game live</span>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
