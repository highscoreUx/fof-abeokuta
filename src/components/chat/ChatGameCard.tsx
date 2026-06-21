"use client";

import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { useSocket } from "@/hooks/useSocket";
import {
  applyOptimisticChatGameAction,
  type ChatGameOptimisticAction,
} from "@/lib/chat-game-optimistic";
import type {
  ChatGameMessageBody,
  ChatGameRematchPayload,
  ChatGameSessionSnapshot,
} from "@/lib/chat-game-types";
import { isTerminalChatGameStatus } from "@/lib/chat-game-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { toastError } from "@/lib/toast";

interface ChatGameCardProps {
  chatGame: ChatGameMessageBody;
}

function snapshotToMessageBody(
  snapshot: ChatGameSessionSnapshot,
  options?: Pick<ChatGameMessageBody, "spectatorInvite">,
): ChatGameMessageBody {
  return {
    type: "chat_game",
    sessionId: snapshot.sessionId,
    gameKind: snapshot.kind,
    title: snapshot.title,
    status: snapshot.status,
    hostUserId: snapshot.hostUserId,
    hostFirstName: snapshot.hostFirstName,
    joinPolicy: snapshot.joinPolicy,
    maxPlayers: snapshot.maxPlayers,
    players: snapshot.players,
    spectatorCount: snapshot.spectatorCount,
    matchId: snapshot.matchId ?? undefined,
    text: snapshot.text,
    ...(options?.spectatorInvite ? { spectatorInvite: true } : {}),
  };
}

export function ChatGameCard({ chatGame }: ChatGameCardProps) {
  const { api } = useEventApi();
  const { user } = useAuth();
  const router = useRouter();
  const socket = useSocket();
  const { home } = useEventNav();
  const [serverLocal, setServerLocal] = useState(chatGame);
  const spectatorInviteRef = useRef(Boolean(chatGame.spectatorInvite));
  const [displayLocal, addOptimisticAction] = useOptimistic(
    serverLocal,
    (current, action: ChatGameOptimisticAction) => {
      if (!user) return current;
      return applyOptimisticChatGameAction(current, action, user);
    },
  );
  const [, startActionTransition] = useTransition();
  const [rematchPending, setRematchPending] = useState(false);
  const local = isTerminalChatGameStatus(serverLocal.status) ? serverLocal : displayLocal;
  const sessionId = chatGame.sessionId;
  const isPendingCard = sessionId.startsWith("pending-game-");

  const applySession = useCallback((session: ChatGameSessionSnapshot) => {
    setServerLocal(
      snapshotToMessageBody(session, {
        spectatorInvite: spectatorInviteRef.current || undefined,
      }),
    );
  }, []);

  const refreshSession = useCallback(async () => {
    if (isPendingCard) return null;
    try {
      const data = await api<{ session: ChatGameSessionSnapshot }>(`/chat-games/${sessionId}`);
      if (data.session) applySession(data.session);
      return data.session ?? null;
    } catch {
      return null;
    }
  }, [api, sessionId, applySession, isPendingCard]);

  useEffect(() => {
    if (chatGame.spectatorInvite) spectatorInviteRef.current = true;
    setServerLocal(chatGame);
    if (!isPendingCard && (chatGame.status === "lobby" || chatGame.status === "live")) {
      void refreshSession();
    }
  }, [chatGame, refreshSession, isPendingCard]);

  useEffect(() => {
    if (!socket || isPendingCard) return;

    const onState = (snapshot: ChatGameSessionSnapshot) => {
      if (snapshot.sessionId !== sessionId) return;
      applySession(snapshot);
    };

    socket.on("chat:game:state", onState);
    return () => {
      socket.off("chat:game:state", onState);
    };
  }, [socket, sessionId, applySession, isPendingCard]);

  useEffect(() => {
    if (!socket || !user) return;

    const onRematch = (payload: ChatGameRematchPayload) => {
      if (payload.fromSessionId !== sessionId) return;
      const wasPlayer = payload.session.players.some((player) => player.userId === user.id);
      if (!wasPlayer) return;
      router.replace(`${home}/game/${payload.session.sessionId}`);
    };

    socket.on("chat:game:rematch", onRematch);
    return () => {
      socket.off("chat:game:rematch", onRematch);
    };
  }, [socket, sessionId, user, home, router]);

  const isHost = user?.id === local.hostUserId;
  const isPlayer = local.players.some((player) => player.userId === user?.id);
  const isFull = local.players.length >= local.maxPlayers;
  const isSpectatorInvite = Boolean(local.spectatorInvite);
  const isReadyToPlay =
    local.status === "lobby" &&
    ((isFull && (isPlayer || isHost)) ||
      (isHost && local.gameKind === "spinner" && local.players.length >= 2));
  const canJoin =
    local.status === "lobby" &&
    !isPlayer &&
    !isFull &&
    !isPendingCard &&
    !isSpectatorInvite;
  const canHostStart =
    isHost &&
    local.status === "lobby" &&
    local.gameKind === "spinner" &&
    local.players.length >= 2;
  const canCancel =
    (isHost || isPlayer) && (local.status === "lobby" || local.status === "live");
  const canSpectate =
    !isPlayer && (local.status === "live" || (local.status === "lobby" && isFull));
  const canWatchInvite =
    isSpectatorInvite &&
    !isPlayer &&
    !isPendingCard &&
    (local.status === "lobby" || local.status === "live");
  const canSeeInviteResults =
    isSpectatorInvite && !isPlayer && !isPendingCard && local.status === "ended";
  const focusHref = `${home}/game/${local.sessionId}`;

  const postAction = useCallback(
    (action: string, optimisticAction?: ChatGameOptimisticAction, asSpectator = false) => {
      if (!user || isPendingCard) return Promise.resolve(null);

      return new Promise<ChatGameSessionSnapshot | null>((resolve) => {
        startActionTransition(async () => {
          if (optimisticAction) addOptimisticAction(optimisticAction);
          try {
            const data = await api<{ session: ChatGameSessionSnapshot }>(
              `/chat-games/${local.sessionId}`,
              {
                method: "POST",
                body: JSON.stringify({ action, asSpectator }),
              },
            );
            if (data.session) applySession(data.session);
            resolve(data.session);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Action failed";
            const refreshed = await refreshSession();
            if (
              refreshed &&
              refreshed.status !== "lobby" &&
              refreshed.status !== "live" &&
              (message.includes("ended") ||
                message.includes("finished") ||
                message.includes("started"))
            ) {
              resolve(refreshed);
              return;
            }
            toastError(message);
            throw error;
          }
        });
      });
    },
    [
      user,
      isPendingCard,
      addOptimisticAction,
      api,
      local.sessionId,
      applySession,
      refreshSession,
    ],
  );

  const rematch = () => {
    setRematchPending(true);
    void postAction("rematch")
      .then((session) => {
        if (session) router.replace(`${home}/game/${session.sessionId}`);
      })
      .finally(() => setRematchPending(false));
  };

  const statusLabel =
    local.status === "lobby"
      ? isReadyToPlay
        ? "Ready"
        : "Waiting"
      : local.status === "live"
        ? "Live"
        : local.status === "ended"
          ? "Finished"
          : "Cancelled";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition",
        isPendingCard && "border-primary/30 bg-primary/5 opacity-90",
        isReadyToPlay
          ? "border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/30"
          : local.status === "live"
            ? "border-amber-500/30 bg-amber-500/5"
            : !isPendingCard && "border-primary/20 bg-primary/5",
      )}
    >
      {isReadyToPlay && (
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Ready to play!
        </p>
      )}
      {local.status === "live" && isPlayer && (
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Game is live — your turn may be waiting
        </p>
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {local.title} · {statusLabel}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{local.text}</p>
      {local.players.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Players:{" "}
          {local.players
            .map((player) => `${player.firstName}${player.slot ? ` (${player.slot})` : ""}`)
            .join(" vs ")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {canHostStart && (
          <Button
            size="sm"
            onClick={() => void postAction("start", { type: "start" })}
          >
            Start game
          </Button>
        )}
        {canJoin && (
          <Button
            size="sm"
            onClick={() => {
              void postAction("join", { type: "join" }).then((session) => {
                if (session) router.push(`${home}/game/${session.sessionId}`);
              });
            }}
          >
            Join game
          </Button>
        )}
        {(local.status === "live" || local.status === "lobby") &&
          (isPlayer || isHost) &&
          !isPendingCard && (
            <Link href={focusHref}>
              <Button
                size="sm"
                variant={isReadyToPlay || local.status === "live" ? "primary" : "secondary"}
              >
                {local.status === "live" ? "Play now" : isReadyToPlay ? "Play now" : "Open lobby"}
              </Button>
            </Link>
          )}
        {(canSpectate || canWatchInvite) && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void postAction("join", { type: "join", asSpectator: true }, true).then(() => {
                router.push(focusHref);
              });
            }}
          >
            Watch
          </Button>
        )}
        {canSeeInviteResults && local.matchId && (
          <Link href={focusHref}>
            <Button size="sm" variant="secondary">
              See results
            </Button>
          </Link>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void postAction("cancel", { type: "cancel" })}
          >
            Cancel
          </Button>
        )}
        {local.status === "ended" && isPlayer && (
          <Button size="sm" disabled={rematchPending} onClick={rematch}>
            {rematchPending ? "Starting rematch…" : "Rematch"}
          </Button>
        )}
        {local.status === "ended" && local.matchId && !canSeeInviteResults && (
          <Link href={focusHref}>
            <Button size="sm" variant="secondary">
              View result
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
