"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEventApi } from "@/hooks/useEventApi";
import { useSocket } from "@/hooks/useSocket";
import { TicTacToeMatchLive } from "@/components/tic-tac-toe/TicTacToeMatchLive";
import { BracketChampionshipSection } from "@/components/activity-bracket/BracketChampionshipSection";
import { TttGraceResults } from "@/components/tic-tac-toe/TttFinishedResults";
import { useParticipantActivitiesRegistry } from "@/components/activities/participant-activities-registry";
import { completionGraceRemainingMs } from "@/lib/activities/completion-grace";
import { Button } from "@/components/ui/button";

interface TttChallengeRow {
  id: string;
  title: string;
  mode: "CHAMPION" | "COUNCIL";
  competitionFormat?: "SINGLE_MATCH" | "CHAMPIONSHIP";
  bracketState?: string | null;
  activeMatchId: string | null;
  activeMatchState: string | null;
}

interface TttMatchRow {
  id: string;
  state: string;
  teamX: { letter: string; name: string };
  teamO: { letter: string; name: string };
}

const SOCKET_REFRESH_MS = 800;

export function TicTacToeActivitiesPanel() {
  const { api } = useEventApi();
  const socket = useSocket();
  const { graceRecords } = useParticipantActivitiesRegistry();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("ttt");
  const focusMatchId = searchParams.get("match");

  const [challenges, setChallenges] = useState<TttChallengeRow[]>([]);
  const [matches, setMatches] = useState<TttMatchRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(focusId);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(focusMatchId);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setInitialLoading(true);
      try {
        const data = await api<{ challenges: TttChallengeRow[] }>("/tic-tac-toe-challenges");
        setChallenges(data.challenges);
        if (focusId) setSelectedId(focusId);
        else if (data.challenges.length === 1) setSelectedId(data.challenges[0].id);
      } catch {
        // Keep the last known list during background refresh failures.
      } finally {
        if (!options?.silent) setInitialLoading(false);
      }
    },
    [api, focusId],
  );

  const loadMatches = useCallback(
    async (challengeId: string) => {
      try {
        const data = await api<{ matches: TttMatchRow[] }>(
          `/tic-tac-toe-challenges/${challengeId}/matches`,
        );
        setMatches(data.matches.filter((m) => m.state !== "FINISHED"));
        const active = data.matches.find((m) => m.state === "ACTIVE" || m.state === "WAITING");
        if (focusMatchId) setSelectedMatchId(focusMatchId);
        else if (active) setSelectedMatchId(active.id);
      } catch {
        // Live board updates still flow over the socket in TicTacToeMatchLive.
      }
    },
    [api, focusMatchId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void load({ silent: true });
      }, SOCKET_REFRESH_MS);
    };

    socket.on("ttt:state", scheduleRefresh);
    socket.on("bracket:state", scheduleRefresh);
    return () => {
      socket.off("ttt:state", scheduleRefresh);
      socket.off("bracket:state", scheduleRefresh);
      if (timer) clearTimeout(timer);
    };
  }, [socket, load]);

  useEffect(() => {
    if (selectedId) void loadMatches(selectedId);
  }, [selectedId, loadMatches]);

  const liveChallenges = challenges.filter(
    (challenge) =>
      (challenge.competitionFormat === "CHAMPIONSHIP" && challenge.bracketState === "ACTIVE") ||
      (challenge.activeMatchId &&
        (challenge.activeMatchState === "WAITING" || challenge.activeMatchState === "ACTIVE")),
  );
  const liveMatchIds = new Set(
    liveChallenges.map((challenge) => challenge.activeMatchId).filter(Boolean) as string[],
  );
  const graceMatches = graceRecords.filter(
    (record): record is Extract<typeof record, { type: "ttt" }> =>
      record.type === "ttt" && !liveMatchIds.has(record.matchId),
  );

  if (initialLoading) {
    return null;
  }

  if (liveChallenges.length === 0 && graceMatches.length === 0) {
    return null;
  }

  const selected =
    liveChallenges.find((c) => c.id === selectedId) ??
    liveChallenges.find((c) => c.id === focusId) ??
    liveChallenges[0];

  const liveMatches = matches.filter((m) => m.state === "WAITING" || m.state === "ACTIVE");

  return (
    <div className="space-y-4">
      {liveChallenges.length > 0 && (
        <>
          {liveChallenges.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {liveChallenges.map((c) => (
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

          {selected.competitionFormat === "CHAMPIONSHIP" ? (
            <BracketChampionshipSection
              challengeId={selected.id}
              gameType="tic_tac_toe"
              renderMatch={(matchId) => (
                <TicTacToeMatchLive challengeId={selected.id} initialMatchId={matchId} />
              )}
            />
          ) : (
            <>
              {liveMatches.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {liveMatches.map((m) => (
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
            </>
          )}
        </>
      )}

      {graceMatches.map((record) => (
        <TttGraceResults
          key={record.key}
          snapshot={record.snapshot}
          graceRemainingMs={completionGraceRemainingMs(record.completedAt)}
        />
      ))}
    </div>
  );
}
