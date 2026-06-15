"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { ChampionshipBracketPanel } from "@/components/activity-bracket/ChampionshipBracketPanel";
import type { ActivityBracketSnapshot } from "@/lib/activity-bracket/types";

interface BracketChampionshipSectionProps {
  challengeId: string;
  gameType: "tic_tac_toe" | "hangman";
  renderMatch: (matchId: string) => ReactNode;
}

export function BracketChampionshipSection({
  challengeId,
  gameType,
  renderMatch,
}: BracketChampionshipSectionProps) {
  const socket = useSocket();
  const { api } = useEventApi();
  const [bracket, setBracket] = useState<ActivityBracketSnapshot | null>(null);

  const loadBracket = useCallback(async () => {
    try {
      const path =
        gameType === "tic_tac_toe"
          ? `/tic-tac-toe-challenges/${challengeId}`
          : `/hangman-challenges/${challengeId}`;
      const data = await api<{ challenge: { bracket?: ActivityBracketSnapshot | null } }>(path);
      if (data.challenge.bracket) setBracket(data.challenge.bracket);
    } catch {
      // Socket updates may still arrive.
    }
  }, [api, challengeId, gameType]);

  useEffect(() => {
    void loadBracket();
  }, [loadBracket]);

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
  const activeMatchIds =
    currentRound?.slots
      .map((slot) => slot.activeMatchId)
      .filter((id): id is string => Boolean(id)) ?? [];

  return (
    <div className="space-y-4">
      <ChampionshipBracketPanel
        challengeId={challengeId}
        gameType={gameType}
        initialBracket={bracket}
      />
      {activeMatchIds.map((matchId) => (
        <div key={matchId}>{renderMatch(matchId)}</div>
      ))}
    </div>
  );
}
