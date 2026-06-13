"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { TicTacToeBoard } from "@/components/tic-tac-toe/TicTacToeBoard";
import { TttGraceResults } from "@/components/tic-tac-toe/TttFinishedResults";
import { useParticipantActivitiesRegistry } from "@/components/activities/participant-activities-registry";
import { useActivityCompletionGrace } from "@/hooks/useActivityCompletionGrace";
import type { TicTacToeMatchSnapshot } from "@/lib/tic-tac-toe/types";

interface TicTacToeMatchLiveProps {
  challengeId: string;
  initialMatchId?: string | null;
  compact?: boolean;
}

export function TicTacToeMatchLive({
  challengeId,
  initialMatchId,
  compact = false,
}: TicTacToeMatchLiveProps) {
  const socket = useSocket();
  const { user } = useAuth();
  const { registerCompleted } = useParticipantActivitiesRegistry();
  const [state, setState] = useState<TicTacToeMatchSnapshot | null>(null);
  const registeredMatchId = useRef<string | null>(null);

  const isFinished = state?.state === "FINISHED";
  const { graceExpired, graceRemainingMs, completedAt } = useActivityCompletionGrace(
    Boolean(isFinished),
  );

  useEffect(() => {
    if (!isFinished || !state || !completedAt) return;
    if (registeredMatchId.current === state.matchId) return;

    registeredMatchId.current = state.matchId;
    registerCompleted({
      key: `ttt:${state.matchId}`,
      type: "ttt",
      title: state.challengeTitle,
      completedAt,
      matchId: state.matchId,
      snapshot: state,
    });
  }, [isFinished, state, completedAt, registerCompleted]);

  useEffect(() => {
    if (!state || state.state === "FINISHED") return;
    registeredMatchId.current = null;
  }, [state?.matchId, state?.state]);

  useEffect(() => {
    if (!socket) return;

    const onState = (snapshot: TicTacToeMatchSnapshot) => {
      if (snapshot.challengeId !== challengeId) return;
      setState(snapshot);
    };

    socket.on("ttt:state", onState);
    return () => {
      socket.off("ttt:state", onState);
    };
  }, [socket, challengeId]);

  useEffect(() => {
    const matchId = initialMatchId ?? state?.matchId;
    if (!socket || !matchId) return;
    socket.emit("ttt:match:join", matchId);
  }, [socket, initialMatchId, state?.matchId]);

  const myTeamId = user?.teamId ?? null;
  const isTeamX = Boolean(myTeamId && state?.teamX.id === myTeamId);
  const isTeamO = Boolean(myTeamId && state?.teamO.id === myTeamId);
  const inMatch = isTeamX || isTeamO;
  const turnTeamId = state?.currentTurn === "X" ? state.teamX.id : state?.teamO.id;
  const isMyTurn = Boolean(inMatch && myTeamId === turnTeamId && state?.state === "ACTIVE");

  const myChampion = isTeamX ? state?.championX : isTeamO ? state?.championO : null;
  const needsChampion =
    state?.mode === "CHAMPION" &&
    inMatch &&
    state.state !== "FINISHED" &&
    !myChampion;

  const canMoveChampion =
    state?.mode === "CHAMPION" &&
    isMyTurn &&
    myChampion?.userId === user?.id;

  const canVoteCouncil = state?.mode === "COUNCIL" && isMyTurn;

  const myVote =
    user && state?.councilVotes ? state.councilVotes[user.id] : undefined;

  const startMatch = () => {
    if (!initialMatchId) return;
    socket?.emit("ttt:match:start", initialMatchId);
  };

  const volunteerChampion = () => {
    if (!state || !myTeamId) return;
    socket?.emit("ttt:champion:set", {
      matchId: state.matchId,
      teamId: myTeamId,
      championUserId: user?.id,
    });
  };

  const playCell = (index: number) => {
    if (!state) return;
    socket?.emit("ttt:move", { matchId: state.matchId, cellIndex: index });
  };

  if (!state) {
    return null;
  }

  if (isFinished) {
    if (graceExpired) {
      return null;
    }

    return <TttGraceResults snapshot={state} graceRemainingMs={graceRemainingMs} />;
  }

  const statusText = () => {
    if (state.state === "WAITING") return "Waiting to start";
    if (state.state === "FINISHED") {
      if (state.isDraw) return "Draw";
      const winner = state.winnerTeamId === state.teamX.id ? state.teamX : state.teamO;
      return `Team ${winner.letter} wins`;
    }
    const turnTeam = state.currentTurn === "X" ? state.teamX : state.teamO;
    return `Team ${turnTeam.letter}'s turn`;
  };

  return (
    <Card className={compact ? "p-4" : "p-6"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{state.challengeTitle}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Team {state.teamX.letter} (X) vs Team {state.teamO.letter} (O)
            {" · "}
            {state.mode === "CHAMPION" ? "Champion" : "Council"}
          </p>
        </div>
        {!inMatch && state.state === "ACTIVE" && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Spectating
          </span>
        )}
      </div>

      <div className="mt-4 flex justify-between text-sm font-medium">
        <span style={{ color: state.teamX.color }}>
          {state.teamX.letter}
          {state.championX ? ` · ${state.championX.firstName}` : ""}
        </span>
        <span className="text-muted-foreground">{statusText()}</span>
        <span style={{ color: state.teamO.color }}>
          {state.teamO.letter}
          {state.championO ? ` · ${state.championO.firstName}` : ""}
        </span>
      </div>

      <div className="mt-6">
        <TicTacToeBoard
          board={state.board}
          currentTurn={state.currentTurn}
          teamXColor={state.teamX.color}
          teamOColor={state.teamO.color}
          disabled={!canMoveChampion && !canVoteCouncil}
          highlightCell={myVote ?? null}
          onCellClick={canMoveChampion || canVoteCouncil ? playCell : undefined}
        />
      </div>

      {state.mode === "COUNCIL" && isMyTurn && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Tap a cell to vote. Move applies when a majority agrees.
        </p>
      )}

      {state.mode === "COUNCIL" && isMyTurn && Object.keys(state.councilVoteCounts).length > 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Votes:{" "}
          {Object.entries(state.councilVoteCounts)
            .map(([cell, count]) => `cell ${Number(cell) + 1}: ${count}`)
            .join(" · ")}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {state.state === "WAITING" && initialMatchId && (
          <Button onClick={startMatch}>Start match</Button>
        )}
        {needsChampion && (
          <Button variant="secondary" onClick={volunteerChampion}>
            Volunteer as champion
          </Button>
        )}
      </div>
    </Card>
  );
}
