"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { BracketMatchSeriesLabel } from "@/components/activity-bracket/BracketMatchSeriesLabel";
import { TicTacToeBoard } from "@/components/tic-tac-toe/TicTacToeBoard";
import { TttGraceResults } from "@/components/tic-tac-toe/TttFinishedResults";
import { useOptionalParticipantActivitiesRegistry } from "@/components/activities/participant-activities-registry";
import { useActivityCompletionGrace } from "@/hooks/useActivityCompletionGrace";
import type { TicTacToeMatchSnapshot } from "@/lib/tic-tac-toe/types";

interface TicTacToeMatchLiveProps {
  challengeId: string;
  initialMatchId?: string | null;
  compact?: boolean;
  socialSessionId?: string;
}

export function TicTacToeMatchLive({
  challengeId,
  initialMatchId,
  compact = false,
  socialSessionId,
}: TicTacToeMatchLiveProps) {
  const socket = useSocket();
  const { user, isHydrated } = useAuth();
  const { registerCompleted } = useOptionalParticipantActivitiesRegistry();
  const [state, setState] = useState<TicTacToeMatchSnapshot | null>(null);
  const registeredMatchId = useRef<string | null>(null);
  const joinedMatchId = useRef<string | null>(null);

  const isFinished = state?.state === "FINISHED";
  const { graceExpired, graceRemainingMs, completedAt } = useActivityCompletionGrace(
    Boolean(isFinished),
  );

  useEffect(() => {
    if (socialSessionId || !isFinished || !state || !completedAt) return;
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
  }, [socialSessionId, isFinished, state, completedAt, registerCompleted]);

  useEffect(() => {
    if (!state || state.state === "FINISHED") return;
    registeredMatchId.current = null;
  }, [state?.matchId, state?.state]);

  useEffect(() => {
    setState(null);
    joinedMatchId.current = null;
  }, [initialMatchId]);

  useEffect(() => {
    if (!socket || !initialMatchId) return;

    const onState = (snapshot: TicTacToeMatchSnapshot) => {
      if (snapshot.challengeId !== challengeId) return;
      if (snapshot.matchId !== initialMatchId) return;
      setState(snapshot);
    };

    socket.on("ttt:state", onState);
    return () => {
      socket.off("ttt:state", onState);
    };
  }, [socket, challengeId, initialMatchId]);

  useEffect(() => {
    if (!socket || !initialMatchId) return;
    if (joinedMatchId.current === initialMatchId) return;
    joinedMatchId.current = initialMatchId;
    socket.emit("ttt:match:join", initialMatchId);
  }, [socket, initialMatchId]);

  const myTeamId = isHydrated ? (user?.teamId ?? null) : null;
  const isSocial = Boolean(state?.isSocial);
  const isPlayerX = isSocial
    ? Boolean(user?.id && state?.playerX?.userId === user.id)
    : Boolean(myTeamId && state?.teamX.id === myTeamId);
  const isPlayerO = isSocial
    ? Boolean(user?.id && state?.playerO?.userId === user.id)
    : Boolean(myTeamId && state?.teamO.id === myTeamId);
  const isTeamX = isPlayerX;
  const isTeamO = isPlayerO;
  const inMatch = isTeamX || isTeamO;
  const turnPlayerId = isSocial
    ? state?.currentTurn === "X"
      ? state.playerX?.userId
      : state?.playerO?.userId
    : null;
  const turnTeamId = state?.currentTurn === "X" ? state.teamX.id : state?.teamO.id;
  const isMyTurn = isSocial
    ? Boolean(inMatch && user?.id === turnPlayerId && state?.state === "ACTIVE")
    : Boolean(inMatch && myTeamId === turnTeamId && state?.state === "ACTIVE");

  const myChampion = isTeamX ? state?.championX : isTeamO ? state?.championO : null;
  const needsChampion =
    !isSocial &&
    state?.mode === "CHAMPION" &&
    inMatch &&
    state.state !== "FINISHED" &&
    !myChampion;

  const canMoveChampion = isSocial
    ? Boolean(isMyTurn)
    : state?.mode === "CHAMPION" && isMyTurn && myChampion?.userId === user?.id;

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
    return (
      <Card className={compact ? "p-4" : "p-6"}>
        <p className="text-sm text-muted-foreground">Loading match…</p>
      </Card>
    );
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
      if (state.isSocial && state.winnerUserId) {
        const winner =
          state.winnerUserId === state.playerX?.userId ? state.playerX : state.playerO;
        return winner ? `${winner.firstName} wins` : "Finished";
      }
      const winner = state.winnerTeamId === state.teamX.id ? state.teamX : state.teamO;
      return `Team ${winner.letter} wins`;
    }
    const turnTeam = state.currentTurn === "X" ? state.teamX : state.teamO;
    if (state.isSocial) {
      const turnPlayer = state.currentTurn === "X" ? state.playerX : state.playerO;
      return turnPlayer ? `${turnPlayer.firstName}'s turn` : `${turnTeam.letter}'s turn`;
    }
    return `Team ${turnTeam.letter}'s turn`;
  };

  return (
    <Card className={compact ? "p-4" : "p-6"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{state.challengeTitle}</CardTitle>
          <BracketMatchSeriesLabel bracket={state.bracket} />
          <p className="mt-1 text-sm text-muted-foreground">
            {state.isSocial
              ? `${state.playerX?.firstName ?? state.teamX.letter} (X) vs ${state.playerO?.firstName ?? state.teamO.letter} (O)`
              : `Team ${state.teamX.letter} (X) vs Team ${state.teamO.letter} (O)`}
            {!state.isSocial && (
              <>
                {" · "}
                {state.mode === "CHAMPION" ? "Champion" : "Council"}
              </>
            )}
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
        {state.state === "WAITING" && initialMatchId && !isSocial && (
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
