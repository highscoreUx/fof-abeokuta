"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { HangmanBackground } from "@/components/hangman/HangmanBackground";
import { BracketMatchSeriesLabel } from "@/components/activity-bracket/BracketMatchSeriesLabel";
import { HangmanFigure } from "@/components/hangman/HangmanFigure";
import { HangmanKeyboard } from "@/components/hangman/HangmanKeyboard";
import { HangmanWordDisplay } from "@/components/hangman/HangmanWordDisplay";
import { HangmanFinishedResults } from "@/components/hangman/HangmanFinishedResults";
import { useOptionalParticipantActivitiesRegistry } from "@/components/activities/participant-activities-registry";
import { useActivityCompletionGrace } from "@/hooks/useActivityCompletionGrace";
import type { HangmanMatchSnapshot } from "@/lib/hangman/types";
import { getSocialHangmanRoundTopicLabel } from "@/lib/chat-game-hangman-settings";

interface HangmanMatchLiveProps {
  challengeId: string;
  initialMatchId?: string | null;
  compact?: boolean;
  socialSessionId?: string;
}

export function HangmanMatchLive({
  challengeId,
  initialMatchId,
  compact = false,
  socialSessionId,
}: HangmanMatchLiveProps) {
  const socket = useSocket();
  const { user, isHydrated } = useAuth();
  const { registerCompleted } = useOptionalParticipantActivitiesRegistry();
  const [state, setState] = useState<HangmanMatchSnapshot | null>(null);
  const [now, setNow] = useState(() => Date.now());
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
      key: `hangman:${state.matchId}`,
      type: "hangman",
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

    const onState = (snapshot: HangmanMatchSnapshot) => {
      if (snapshot.challengeId !== challengeId) return;
      if (snapshot.matchId !== initialMatchId) return;
      setState(snapshot);
    };

    socket.on("hangman:state", onState);
    return () => {
      socket.off("hangman:state", onState);
    };
  }, [socket, challengeId, initialMatchId]);

  useEffect(() => {
    if (!socket || !initialMatchId) return;
    if (joinedMatchId.current === initialMatchId) return;
    joinedMatchId.current = initialMatchId;
    socket.emit("hangman:match:join", initialMatchId);
  }, [socket, initialMatchId]);

  useEffect(() => {
    if (!state?.socialHangman?.turnDeadlineAt || state.state !== "ACTIVE") return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [state?.socialHangman?.turnDeadlineAt, state?.state]);

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

  const canGuessChampion = isSocial
    ? Boolean(isMyTurn)
    : state?.mode === "CHAMPION" && isMyTurn && myChampion?.userId === user?.id;

  const canVoteCouncil = state?.mode === "COUNCIL" && isMyTurn;

  const myVote = user && state?.councilVotes ? state.councilVotes[user.id] : undefined;

  const turnTeamWrong =
    state?.currentTurn === "X" ? state.wrongGuessesX : state?.wrongGuessesO ?? 0;

  const startMatch = () => {
    if (!initialMatchId) return;
    socket?.emit("hangman:match:start", initialMatchId);
  };

  const volunteerChampion = () => {
    if (!state || !myTeamId || !user?.id) return;
    socket?.emit("hangman:champion:set", {
      matchId: state.matchId,
      teamId: myTeamId,
      championUserId: user.id,
    });
  };

  const guessLetter = (letter: string) => {
    if (!state) return;
    socket?.emit("hangman:guess", { matchId: state.matchId, letter });
  };

  if (!state) {
    return (
      <HangmanBackground className={compact ? "p-4 sm:p-6" : "p-6 sm:p-10"}>
        <p className="text-center text-sm text-white/70">Loading match…</p>
      </HangmanBackground>
    );
  }

  if (isFinished) {
    if (graceExpired) return null;
    return <HangmanFinishedResults snapshot={state} graceRemainingMs={graceRemainingMs} />;
  }

  const turnTeam = state.currentTurn === "X" ? state.teamX : state.teamO;
  const statusText =
    state.state === "WAITING"
      ? "Waiting to start"
      : isSocial
        ? `${turnTeam.name}'s turn`
        : `Team ${turnTeam.letter}'s turn`;

  return (
    <HangmanBackground className={compact ? "p-4 sm:p-6" : "p-6 sm:p-10"}>
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#5DA9EF]">
            The Hangman Game
          </p>
          <h2 className="mt-2 text-xl font-black sm:text-3xl">{state.challengeTitle}</h2>
          <BracketMatchSeriesLabel
            bracket={state.bracket}
            className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#5DA9EF]"
          />
          <p className="mt-2 text-sm text-white/80">
            {isSocial
              ? `${state.teamX.name} vs ${state.teamO.name}`
              : `Team ${state.teamX.letter} vs Team ${state.teamO.letter}`}
            {!isSocial && (
              <>
                {" · "}
                {state.mode === "CHAMPION" ? "Champion" : "Council"}
              </>
            )}
          </p>
          {isSocial && state.socialHangman?.settings.seriesMode === "race" && (
            <p className="mt-2 text-sm font-semibold text-white">
              Score {state.playerX?.firstName ?? "X"} {state.socialHangman.score.x} –{" "}
              {state.socialHangman.score.o} {state.playerO?.firstName ?? "O"}
              {state.socialHangman.settings.raceTarget > 1
                ? ` · first to ${state.socialHangman.settings.raceTarget}`
                : ""}
            </p>
          )}
          {isSocial && state.socialHangman && (
            <p className="mt-1 text-xs text-white/60">
              Topic:{" "}
              {getSocialHangmanRoundTopicLabel(
                state.socialHangman.settings,
                state.socialHangman.currentTopicId,
              )}
            </p>
          )}
        </div>

        {!inMatch && state.state === "ACTIVE" && (
          <div className="mt-4 flex justify-center">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              Spectating
            </span>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-[#5DA9EF]/40 bg-[#131381]/40 p-4 backdrop-blur-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
            <span style={{ color: state.teamX.color }}>
              {state.teamX.letter}: {state.wrongGuessesX}/{state.maxWrongGuesses}
            </span>
            <span className="text-white/80">{statusText}</span>
            <span style={{ color: state.teamO.color }}>
              {state.teamO.letter}: {state.wrongGuessesO}/{state.maxWrongGuesses}
            </span>
          </div>

          {isSocial &&
            state.socialHangman?.settings.turnTimerEnabled &&
            state.socialHangman.turnDeadlineAt &&
            state.state === "ACTIVE" && (
              <p className="mt-2 text-center text-xs text-white/70">
                {Math.max(0, Math.ceil((state.socialHangman.turnDeadlineAt - now) / 1000))}s left
                this turn
              </p>
            )}

          <div className="mt-6 flex flex-col items-center gap-6 md:flex-row md:justify-center">
            <HangmanFigure wrongCount={turnTeamWrong} maxWrong={state.maxWrongGuesses} />
            <div className="flex-1 space-y-6">
              <HangmanWordDisplay wordMask={state.wordMask} />
              <HangmanKeyboard
                guessedLetters={state.guessedLetters}
                disabled={!canGuessChampion && !canVoteCouncil}
                highlightLetter={myVote ?? null}
                onLetterClick={
                  canGuessChampion || canVoteCouncil ? guessLetter : undefined
                }
              />
            </div>
          </div>

          {state.mode === "COUNCIL" && isMyTurn && (
            <p className="mt-4 text-center text-sm text-white/70">
              Tap a letter to vote. Guess applies when a majority agrees.
            </p>
          )}

          {state.mode === "COUNCIL" &&
            isMyTurn &&
            Object.keys(state.councilVoteCounts).length > 0 && (
              <p className="mt-2 text-center text-xs text-white/60">
                Votes:{" "}
                {Object.entries(state.councilVoteCounts)
                  .map(([letter, count]) => `${letter}: ${count}`)
                  .join(" · ")}
              </p>
            )}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {state.state === "WAITING" && initialMatchId && !isSocial && (
            <Button onClick={startMatch}>Start match</Button>
          )}
          {needsChampion && (
            <Button variant="secondary" onClick={volunteerChampion}>
              Volunteer as champion
            </Button>
          )}
        </div>
      </div>
    </HangmanBackground>
  );
}
