"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { QuizStageDisplay } from "@/components/quiz/QuizStageDisplay";
import { useAuth } from "@/hooks/useAuth";
import { TriviaAnswerInput } from "@/components/trivia/TriviaAnswerInput";
import {
  formatPoints,
  formatResponseTime,
  getServerSyncedRemainingMs,
} from "@/lib/kahoot-ui";
import type { QuizAnswerResult, QuizStateSnapshot, TriviaAnswerPayload } from "@/types";
import { cn } from "@/lib/utils";

function KahootTimerBar({
  remainingMs,
  totalMs,
}: {
  remainingMs: number;
  totalMs: number;
}) {
  const pct = totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;
  const urgent = remainingMs <= 3000;
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-foreground/10">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-200",
          urgent ? "bg-[#e21b3c]" : "bg-[#1368ce]",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function LeaderboardList({
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
            entry.userId === highlightUserId ? "bg-primary/15 ring-2 ring-primary" : "bg-foreground/5",
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

type PlayMode = "join" | "spectate" | null;

export function QuizPlayer() {
  const socket = useSocket();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [state, setState] = useState<QuizStateSnapshot | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [answerResult, setAnswerResult] = useState<QuizAnswerResult | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode>(
    searchParams.get("mode") === "spectate" ? "spectate" : null,
  );
  const activeQuestionId = useRef<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const onState = (snapshot: QuizStateSnapshot) => {
      const newQuestionId = snapshot.currentQuestion?.id ?? null;
      if (newQuestionId !== activeQuestionId.current) {
        activeQuestionId.current = newQuestionId;
        setSubmitted(false);
        setAnswerResult(null);
      }
      setState(snapshot);
    };

    const onAnswerResult = (result: QuizAnswerResult) => {
      setAnswerResult(result);
      setSubmitted(true);
    };

    socket.on("quiz:state", onState);
    socket.on("quiz:answer:result", onAnswerResult);
    return () => {
      socket.off("quiz:state", onState);
      socket.off("quiz:answer:result", onAnswerResult);
    };
  }, [socket]);

  useEffect(() => {
    if (!state || state.state !== "QUESTION" || !state.questionStartedAt || !state.currentQuestion) {
      setRemainingMs(0);
      return;
    }

    const totalMs = state.currentQuestion.timeLimitSec * 1000;
    const tick = () => {
      setRemainingMs(
        getServerSyncedRemainingMs(
          state.currentQuestion!.timeLimitSec,
          state.questionStartedAt!,
          Date.now(),
        ),
      );
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [state]);

  const submitAnswer = (payload: TriviaAnswerPayload) => {
    if (!socket || !state?.currentQuestion || submitted) return;
    setSubmitted(true);
    socket.emit("quiz:answer", {
      sessionId: state.sessionId,
      questionId: state.currentQuestion.id,
      answerValue: payload,
      answerIndex: payload.answerIndex,
    });
  };

  if (!state) {
    return (
      <div className="rounded-2xl bg-card p-8 text-center shadow-card">
        <p className="text-muted-foreground">Waiting for the host to start Live Trivia…</p>
      </div>
    );
  }

  if (!playMode && state.state !== "FINISHED") {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#46178f] to-[#1368ce] p-10 text-center text-white shadow-card">
        <p className="text-sm uppercase tracking-widest opacity-80">Live now</p>
        <h2 className="mt-2 text-3xl font-black">{state.quizTitle ?? "Live Trivia"}</h2>
        <p className="mt-4 text-lg opacity-90">Join to answer questions or spectate the game.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => setPlayMode("join")}>
            Join
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setPlayMode("spectate")}>
            Spectate
          </Button>
        </div>
      </div>
    );
  }

  if (playMode === "spectate") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-muted/50 px-4 py-2 text-center text-sm text-muted-foreground">
          Spectating — you are not competing for points
        </div>
        <QuizStageDisplay />
      </div>
    );
  }

  if (state.state === "LOBBY") {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#46178f] to-[#1368ce] p-10 text-center text-white shadow-card">
        <p className="text-sm uppercase tracking-widest opacity-80">Get ready!</p>
        <h2 className="mt-2 text-3xl font-black">{state.quizTitle ?? "Live Trivia"}</h2>
        <p className="mt-4 text-lg opacity-90">
          Question {Math.min(state.questionIndex + 1, state.totalQuestions)} of {state.totalQuestions}
        </p>
      </div>
    );
  }

  if (state.state === "FINISHED") {
    const myRank = state.leaderboard.find((e) => e.userId === user?.id);
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#46178f] to-[#26890c] p-8 text-center text-white">
          <p className="text-sm uppercase tracking-widest opacity-80">Final standings</p>
          <h2 className="mt-2 text-3xl font-black">Activity complete!</h2>
          {myRank && (
            <p className="mt-4 text-xl">
              You placed <strong>#{myRank.rank}</strong> with {formatPoints(myRank.totalPoints)} pts
            </p>
          )}
        </div>
        <LeaderboardList entries={state.leaderboard} highlightUserId={user?.id} />
      </div>
    );
  }

  if (state.state === "RESULTS") {
    const correct = answerResult?.isCorrect;
    return (
      <div className="space-y-4">
        <div
          className={cn(
            "rounded-2xl p-8 text-center text-white",
            correct ? "bg-[#26890c]" : "bg-[#e21b3c]",
          )}
        >
          <p className="text-3xl font-black">{correct ? "Correct!" : "Incorrect"}</p>
          {answerResult && (
            <div className="mt-4 space-y-1 text-lg">
              <p>+{formatPoints(answerResult.points)} points</p>
              <p className="text-sm opacity-90">
                {formatResponseTime(answerResult.responseTimeMs)} · streak {answerResult.streak}
                {answerResult.streakMultiplier > 1 && ` (${answerResult.streakMultiplier}x)`}
              </p>
              <p className="text-sm opacity-90">Total: {formatPoints(answerResult.totalPoints)}</p>
            </div>
          )}
        </div>
        <div>
          <h3 className="mb-3 text-lg font-bold">Leaderboard</h3>
          <LeaderboardList entries={state.leaderboard} highlightUserId={user?.id} compact />
        </div>
      </div>
    );
  }

  const question = state.currentQuestion;
  if (!question) return null;

  const totalMs = question.timeLimitSec * 1000;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Question {state.questionIndex + 1} / {state.totalQuestions}
          </p>
          <h2 className="mt-1 text-xl font-black leading-snug">{question.text}</h2>
        </div>
        <div className="shrink-0 rounded-full bg-foreground px-4 py-2 font-mono text-lg font-bold text-background">
          {Math.ceil(remainingMs / 1000)}s
        </div>
      </div>

      <KahootTimerBar remainingMs={remainingMs} totalMs={totalMs} />

      {submitted && (
        <p className="text-center text-sm font-medium text-muted-foreground">
          Answer locked in — waiting for others…
        </p>
      )}

      <TriviaAnswerInput
        type={question.type ?? "QUIZ"}
        text={question.text}
        options={question.options}
        config={question.config ?? {}}
        mediaUrl={question.mediaUrl}
        disabled={submitted}
        onSubmit={submitAnswer}
      />
    </div>
  );
}
