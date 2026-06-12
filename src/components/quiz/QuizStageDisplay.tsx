"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import {
  formatPoints,
  formatResponseTime,
  getServerSyncedRemainingMs,
  KAHOOT_OPTIONS,
} from "@/lib/kahoot-ui";
import type { QuizStateSnapshot } from "@/types";
import { cn } from "@/lib/utils";

interface QuizStageDisplayProps {
  /** Larger typography for projector / main stage */
  variant?: "default" | "stage";
}

export function QuizStageDisplay({ variant = "default" }: QuizStageDisplayProps) {
  const socket = useSocket();
  const [state, setState] = useState<QuizStateSnapshot | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!socket) return;
    const handler = (snapshot: QuizStateSnapshot) => setState(snapshot);
    socket.on("quiz:state", handler);
    return () => {
      socket.off("quiz:state", handler);
    };
  }, [socket]);

  useEffect(() => {
    if (!state || state.state !== "QUESTION" || !state.questionStartedAt || !state.currentQuestion) {
      setRemainingMs(0);
      return;
    }
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

  const isStage = variant === "stage";

  if (!state) {
    return (
      <div className={cn("rounded-2xl bg-card p-6 text-center", isStage && "p-10")}>
        <p className="text-muted-foreground">No live activity session</p>
      </div>
    );
  }

  if (state.state === "LOBBY") {
    return (
      <div
        className={cn(
          "rounded-2xl bg-gradient-to-br from-[#46178f] to-[#1368ce] p-8 text-center text-white",
          isStage && "p-14",
        )}
      >
        <p className="text-sm uppercase tracking-widest opacity-80">Up next</p>
        <h2 className={cn("mt-2 font-black", isStage ? "text-5xl" : "text-3xl")}>
          {state.quizTitle ?? "Live Trivia"}
        </h2>
        <p className={cn("mt-4 opacity-90", isStage ? "text-2xl" : "text-lg")}>
          Question {Math.min(state.questionIndex + 1, state.totalQuestions)} of {state.totalQuestions}
        </p>
      </div>
    );
  }

  if (state.state === "FINISHED") {
    return (
      <div className="space-y-4">
        <div
          className={cn(
            "rounded-2xl bg-gradient-to-br from-[#46178f] to-[#26890c] p-8 text-center text-white",
            isStage && "p-12",
          )}
        >
          <h2 className={cn("font-black", isStage ? "text-5xl" : "text-3xl")}>Podium</h2>
        </div>
        <div className="space-y-2">
          {state.leaderboard.slice(0, 5).map((entry) => (
            <div
              key={entry.userId}
              className="flex items-center justify-between rounded-xl bg-foreground/5 px-4 py-3"
            >
              <span className={cn("font-bold", isStage && "text-xl")}>
                #{entry.rank} {entry.username}
              </span>
              <span className={cn("font-black", isStage && "text-xl")}>
                {formatPoints(entry.totalPoints)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (state.state === "RESULTS" && state.currentQuestion && state.questionResults) {
    const { correctIndex, optionCounts, topScorers } = state.questionResults;
    const maxCount = Math.max(...optionCounts, 1);
    const qType = state.currentQuestion.type;
    const isImageMcq = qType === "QUIZ_IMAGE";

    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase text-muted-foreground">Results</p>
          <h2 className={cn("mt-2 font-black", isStage ? "text-4xl" : "text-2xl")}>
            {state.currentQuestion.text}
          </h2>
          {state.currentQuestion.mediaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={state.currentQuestion.mediaUrl}
              alt=""
              className="mx-auto mt-4 max-h-40 rounded-xl object-contain"
            />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {state.currentQuestion.options.map((option, index) => {
            const style = KAHOOT_OPTIONS[index % KAHOOT_OPTIONS.length];
            const count = optionCounts[index] ?? 0;
            const isCorrect = index === correctIndex;
            return (
              <div
                key={index}
                className={cn(
                  "overflow-hidden rounded-xl text-white",
                  !isImageMcq && style.bg,
                  isCorrect && "ring-4 ring-white",
                )}
              >
                {isImageMcq ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={option} alt="" className="aspect-video w-full object-cover" />
                    <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-sm font-bold">
                      {count}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl font-black">{style.shape}</span>
                      <span className="flex-1 font-semibold">{option}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                    <div className="h-2 bg-black/20">
                      <div
                        className="h-full bg-white/50 transition-all"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div>
          <h3 className="mb-2 font-bold">Fastest correct</h3>
          <div className="space-y-2">
            {topScorers
              .filter((s) => s.isCorrect)
              .slice(0, 3)
              .map((s) => (
                <div
                  key={s.userId}
                  className="flex justify-between rounded-lg bg-foreground/5 px-4 py-2"
                >
                  <span>{s.username}</span>
                  <span>
                    +{formatPoints(s.points)} · {formatResponseTime(s.responseTimeMs)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 font-bold">Leaderboard</h3>
          <div className="space-y-2">
            {state.leaderboard.slice(0, 5).map((entry) => (
              <div
                key={entry.userId}
                className="flex justify-between rounded-lg bg-foreground/5 px-4 py-2"
              >
                <span>
                  #{entry.rank} {entry.username}
                </span>
                <span className="font-bold">{formatPoints(entry.totalPoints)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const question = state.currentQuestion;
  if (!question) return null;

  const showOptionGrid =
    question.type === "QUIZ" ||
    question.type === "QUIZ_IMAGE" ||
    question.type === "TRUE_FALSE" ||
    question.type === "QUIZ_AUDIO";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Question {state.questionIndex + 1} / {state.totalQuestions}
          </p>
          <h2 className={cn("mt-2 font-black leading-tight", isStage ? "text-4xl" : "text-2xl")}>
            {question.text}
          </h2>
        </div>
        <div
          className={cn(
            "shrink-0 rounded-full bg-foreground font-mono font-bold text-background",
            isStage ? "px-6 py-3 text-3xl" : "px-4 py-2 text-xl",
          )}
        >
          {Math.ceil(remainingMs / 1000)}
        </div>
      </div>

      {question.type === "QUIZ_AUDIO" && question.mediaUrl && (
        <audio controls src={question.mediaUrl} className="w-full max-w-xl" />
      )}

      {question.mediaUrl &&
        (question.type === "QUIZ_IMAGE" ||
          question.type === "PUZZLE_IMAGE" ||
          question.type === "PIN_ANSWER") && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={question.mediaUrl}
            alt=""
            className="max-h-48 w-full rounded-xl object-contain"
          />
        )}

      {showOptionGrid && (
        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option, index) => {
            const style = KAHOOT_OPTIONS[index % KAHOOT_OPTIONS.length];
            if (question.type === "QUIZ_IMAGE") {
              return (
                <div key={index} className="overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={option} alt="" className="aspect-video w-full object-cover" />
                </div>
              );
            }
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-4 rounded-xl px-5 py-5 text-white",
                  style.bg,
                  isStage && "py-8",
                )}
              >
                <span className={cn("font-black", isStage ? "text-4xl" : "text-2xl")}>
                  {style.shape}
                </span>
                <span className={cn("font-semibold", isStage && "text-2xl")}>{option}</span>
              </div>
            );
          })}
        </div>
      )}

      {(question.type === "PUZZLE" || question.type === "PUZZLE_IMAGE") && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(question.config.items ?? question.options).map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
            >
              <span className="text-muted-foreground">{index + 1}.</span>
              {question.type === "PUZZLE_IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item} alt="" className="h-20 w-full rounded-lg object-cover" />
              ) : (
                <span className="font-medium">{item}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {state.answeredCount !== undefined && (
        <p className="text-center text-sm text-muted-foreground">
          {state.answeredCount} answered
        </p>
      )}
    </div>
  );
}
