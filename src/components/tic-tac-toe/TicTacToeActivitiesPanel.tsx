"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEventApi } from "@/hooks/useEventApi";
import { TicTacToeMatchLive } from "@/components/tic-tac-toe/TicTacToeMatchLive";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TttChallengeRow {
  id: string;
  title: string;
  mode: "CHAMPION" | "COUNCIL";
  activeMatchId: string | null;
  activeMatchState: string | null;
}

interface TttMatchRow {
  id: string;
  state: string;
  teamX: { letter: string; name: string };
  teamO: { letter: string; name: string };
}

export function TicTacToeActivitiesPanel() {
  const { api } = useEventApi();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("ttt");
  const focusMatchId = searchParams.get("match");

  const [challenges, setChallenges] = useState<TttChallengeRow[]>([]);
  const [matches, setMatches] = useState<TttMatchRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(focusId);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(focusMatchId);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ challenges: TttChallengeRow[] }>("/tic-tac-toe-challenges");
      setChallenges(data.challenges);
      if (focusId) setSelectedId(focusId);
      else if (data.challenges.length === 1) setSelectedId(data.challenges[0].id);
    } finally {
      setLoading(false);
    }
  }, [api, focusId]);

  const loadMatches = useCallback(
    async (challengeId: string) => {
      const data = await api<{ matches: TttMatchRow[] }>(
        `/tic-tac-toe-challenges/${challengeId}/matches`,
      );
      setMatches(data.matches.filter((m) => m.state !== "FINISHED"));
      const active = data.matches.find((m) => m.state === "ACTIVE" || m.state === "WAITING");
      if (focusMatchId) setSelectedMatchId(focusMatchId);
      else if (active) setSelectedMatchId(active.id);
    },
    [api, focusMatchId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId) void loadMatches(selectedId);
  }, [selectedId, loadMatches]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading tic-tac-toe…</p>;
  }

  if (challenges.length === 0) {
    return (
      <Card className="p-6">
        <CardTitle>Team Tic-Tac-Toe</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">No tournaments available yet.</p>
      </Card>
    );
  }

  const selected = challenges.find((c) => c.id === selectedId) ?? challenges[0];

  return (
    <div className="space-y-4">
      {challenges.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {challenges.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={c.id === selected.id ? "primary" : "secondary"}
              onClick={() => {
                setSelectedId(c.id);
                setSelectedMatchId(null);
              }}
            >
              {c.title}
            </Button>
          ))}
        </div>
      )}

      {matches.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {matches.map((m) => (
            <Button
              key={m.id}
              size="sm"
              variant={m.id === selectedMatchId ? "primary" : "secondary"}
              onClick={() => setSelectedMatchId(m.id)}
            >
              {m.teamX.letter} vs {m.teamO.letter}
              {m.state === "ACTIVE" ? " · Live" : ""}
            </Button>
          ))}
        </div>
      )}

      <TicTacToeMatchLive
        challengeId={selected.id}
        initialMatchId={selectedMatchId ?? selected.activeMatchId}
      />
    </div>
  );
}
