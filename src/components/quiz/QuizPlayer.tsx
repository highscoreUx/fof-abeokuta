"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import type { QuizStateSnapshot } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function QuizPlayer() {
  const socket = useSocket();
  const [state, setState] = useState<QuizStateSnapshot | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handler = (snapshot: QuizStateSnapshot) => {
      setState(snapshot);
      setAnswered(false);
    };

    socket.on("quiz:state", handler);
    return () => {
      socket.off("quiz:state", handler);
    };
  }, [socket]);

  useEffect(() => {
    if (!state || state.state !== "QUESTION" || !state.questionStartedAt) {
      setRemaining(0);
      return;
    }

    const tick = () => {
      const limit = (state.currentQuestion?.timeLimitSec ?? 20) * 1000;
      const elapsed = Date.now() - state.questionStartedAt!;
      setRemaining(Math.max(0, Math.ceil((limit - elapsed) / 1000)));
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [state]);

  const submitAnswer = (index: number) => {
    if (!socket || !state?.currentQuestion || answered) return;
    socket.emit("quiz:answer", {
      sessionId: state.sessionId,
      questionId: state.currentQuestion.id,
      answerIndex: index,
    });
    setAnswered(true);
  };

  if (!state) {
    return <Card><p className="text-foreground/60">Waiting for quiz to start...</p></Card>;
  }

  if (state.state === "LOBBY") {
    return <Card><p className="text-lg font-medium">Get ready! Quiz starting soon...</p></Card>;
  }

  if (state.state === "FINISHED") {
    return (
      <Card>
        <h3 className="mb-4 text-xl font-bold">Quiz Finished</h3>
        <div className="space-y-2">
          {state.leaderboard.map((entry) => (
            <div
              key={entry.userId}
              className="flex justify-between rounded-lg bg-foreground/5 p-3 transition-all duration-500"
            >
              <span>#{entry.rank} {entry.username} ({entry.teamLetter})</span>
              <span className="font-bold">{entry.totalPoints} pts</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (state.state === "RESULTS") {
    return (
      <Card>
        <h3 className="mb-2 text-xl font-bold">Results</h3>
        <p className="text-foreground/60">Next question in a moment...</p>
        <div className="mt-4 space-y-2">
          {state.leaderboard.slice(0, 10).map((entry) => (
            <div key={entry.userId} className="flex justify-between rounded-lg bg-foreground/5 p-2">
              <span>#{entry.rank} {entry.username}</span>
              <span>{entry.totalPoints}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">{state.currentQuestion?.text}</h3>
        <span className="rounded-full bg-foreground px-3 py-1 text-background font-mono">
          {remaining}s
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {state.currentQuestion?.options.map((option, index) => (
          <Button
            key={index}
            variant="secondary"
            disabled={answered}
            onClick={() => submitAnswer(index)}
            className="h-auto whitespace-normal py-4 text-left"
          >
            {option}
          </Button>
        ))}
      </div>
    </Card>
  );
}
