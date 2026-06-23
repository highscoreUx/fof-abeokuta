"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import type { ActivityChatBody } from "@/lib/activity-chat-types";
import type { CountdownStateSnapshot } from "@/lib/countdown/types";
import type { HangmanMatchSnapshot } from "@/lib/hangman/types";
import type { SpinnerStateSnapshot } from "@/lib/spinner/types";
import type { TicTacToeMatchSnapshot } from "@/lib/tic-tac-toe/types";
import type { QuizStateSnapshot } from "@/types";

function endedActivity(activity: ActivityChatBody, text?: string): ActivityChatBody {
  return {
    ...activity,
    status: "ended",
    action: "ended",
    text: text ?? `${activity.title} has ended.`,
  };
}

export function useOfficialActivityCardState(initial: ActivityChatBody): ActivityChatBody {
  const socket = useSocket();
  const [activity, setActivity] = useState(initial);

  useEffect(() => {
    setActivity(initial);
  }, [initial]);

  useEffect(() => {
    if (!socket || initial.status === "ended") return;

    const sessionId = initial.sessionId;

    const markEnded = (text?: string) => {
      setActivity((current) =>
        current.status === "ended" ? current : endedActivity(current, text),
      );
    };

    const onQuizState = (snapshot: QuizStateSnapshot) => {
      if (initial.kind !== "kahoot" || snapshot.sessionId !== sessionId) return;
      if (snapshot.state === "FINISHED") {
        markEnded(`${initial.title} has ended.`);
      }
    };

    const onSpinnerState = (snapshot: SpinnerStateSnapshot) => {
      if (initial.kind !== "spinner" || snapshot.sessionId !== sessionId) return;
      if (snapshot.state === "COMPLETED") {
        markEnded(`${initial.title} has ended.`);
      }
    };

    const onCountdownState = (snapshot: CountdownStateSnapshot) => {
      if (initial.kind !== "countdown" || snapshot.sessionId !== sessionId) return;
      if (snapshot.state === "FINISHED") {
        markEnded(`${initial.title} has ended.`);
      }
    };

    const onTttState = (snapshot: TicTacToeMatchSnapshot) => {
      if (initial.kind !== "tic_tac_toe" || snapshot.matchId !== sessionId) return;
      if (snapshot.state === "FINISHED") {
        markEnded(`${initial.title} has finished.`);
      }
    };

    const onHangmanState = (snapshot: HangmanMatchSnapshot) => {
      if (initial.kind !== "hangman" || snapshot.matchId !== sessionId) return;
      if (snapshot.state === "FINISHED") {
        markEnded(`${initial.title} has finished.`);
      }
    };

    socket.on("quiz:state", onQuizState);
    socket.on("spinner:state", onSpinnerState);
    socket.on("countdown:state", onCountdownState);
    socket.on("ttt:state", onTttState);
    socket.on("hangman:state", onHangmanState);

    switch (initial.kind) {
      case "kahoot":
        socket.emit("quiz:session:sync", sessionId);
        break;
      case "spinner":
        socket.emit("spinner:join", sessionId);
        break;
      case "countdown":
        socket.emit("countdown:join", sessionId);
        break;
      case "tic_tac_toe":
        socket.emit("ttt:match:join", sessionId);
        break;
      case "hangman":
        socket.emit("hangman:match:join", sessionId);
        break;
    }

    return () => {
      socket.off("quiz:state", onQuizState);
      socket.off("spinner:state", onSpinnerState);
      socket.off("countdown:state", onCountdownState);
      socket.off("ttt:state", onTttState);
      socket.off("hangman:state", onHangmanState);
    };
  }, [socket, initial]);

  return activity;
}
