"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import type { Socket } from "socket.io-client";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import type { SocialWhotSettings } from "@/lib/chat-game-whot-settings";
import {
  applyOptimisticSocialGameMove,
  type OptimisticSocialGameOptions,
} from "@/lib/social-games/optimistic-move";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";
import { emitSocketAck } from "@/lib/socket/emit-with-ack";
import { toastError } from "@/lib/toast";

interface SocialGameMove {
  action: string;
  payload: Record<string, unknown>;
}

export function useSocialGameState(
  matchId: string,
  sessionId?: string,
  options?: OptimisticSocialGameOptions,
) {
  const socket = useSocket();
  const { user } = useAuth();
  const [serverState, setServerState] = useState<SocialGameMatchSnapshot | null>(null);
  const [displayState, addOptimisticMove] = useOptimistic(
    serverState,
    (current, move: SocialGameMove) => {
      if (!current || !user?.id) return current;
      return applyOptimisticSocialGameMove(
        current,
        user.id,
        move.action,
        move.payload,
        options,
      );
    },
  );
  const [, startMoveTransition] = useTransition();
  const [movePending, setMovePending] = useState(false);
  const joinedMatchId = useRef<string | null>(null);

  const requestState = useCallback(() => {
    if (!socket || !matchId) return;
    joinedMatchId.current = matchId;
    socket.emit("social-game:join", matchId);
  }, [socket, matchId]);

  useEffect(() => {
    setServerState(null);
    joinedMatchId.current = null;
  }, [matchId]);

  useEffect(() => {
    if (!socket || !matchId) return;

    const onState = (snapshot: SocialGameMatchSnapshot) => {
      if (snapshot.matchId !== matchId) return;
      setServerState((prev) => {
        if (
          prev &&
          prev.status === snapshot.status &&
          prev.currentTurnUserId === snapshot.currentTurnUserId &&
          JSON.stringify(prev.state) === JSON.stringify(snapshot.state)
        ) {
          return prev;
        }
        return snapshot;
      });
    };

    socket.on("social-game:state", onState);
    return () => {
      socket.off("social-game:state", onState);
    };
  }, [socket, matchId]);

  useEffect(() => {
    if (!socket || !matchId) return;
    if (joinedMatchId.current === matchId) return;
    requestState();
  }, [socket, matchId, requestState]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      joinedMatchId.current = null;
      requestState();
    };
    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket, requestState]);

  useEffect(() => {
    if (!socket || !sessionId) return;

    const onChatState = (snapshot: { sessionId: string; status: string }) => {
      if (snapshot.sessionId !== sessionId || snapshot.status !== "live") return;
      joinedMatchId.current = null;
      requestState();
    };

    socket.on("chat:game:state", onChatState);
    return () => {
      socket.off("chat:game:state", onChatState);
    };
  }, [socket, sessionId, requestState]);

  const sendMove = useCallback(
    (action: string, payload: Record<string, unknown> = {}) => {
      if (!socket || !serverState || !user?.id) return;

      const skipOptimistic = serverState.kind === "ludo" && action === "roll";

      startMoveTransition(async () => {
        if (!skipOptimistic) {
          addOptimisticMove({ action, payload });
        } else {
          setMovePending(true);
        }

        try {
          await emitSocketAck(socket as Socket, "social-game:move", {
            matchId,
            action,
            payload,
          });
        } catch (error) {
          toastError(error instanceof Error ? error.message : "Invalid move");
          throw error;
        } finally {
          if (skipOptimistic) setMovePending(false);
        }
      });
    },
    [socket, serverState, user?.id, addOptimisticMove, matchId],
  );

  return { state: displayState, serverState, sendMove, movePending };
}
