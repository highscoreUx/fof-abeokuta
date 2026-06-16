"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { useSocket } from "@/hooks/useSocket";
import type { ChatGameMessageBody, ChatGameRematchPayload, ChatGameSessionSnapshot } from "@/lib/chat-game-types";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/toast";

interface ChatGameCardProps {
  chatGame: ChatGameMessageBody;
}

export function ChatGameCard({ chatGame }: ChatGameCardProps) {
  const { api } = useEventApi();
  const { user } = useAuth();
  const router = useRouter();
  const socket = useSocket();
  const { home } = useEventNav();
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState(chatGame);

  useEffect(() => {
    setLocal(chatGame);
  }, [chatGame]);

  useEffect(() => {
    if (!socket) return;

    const onState = (snapshot: ChatGameSessionSnapshot) => {
      if (snapshot.sessionId !== local.sessionId) return;
      setLocal({
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
      });
    };

    socket.on("chat:game:state", onState);
    return () => {
      socket.off("chat:game:state", onState);
    };
  }, [socket, local.sessionId]);

  useEffect(() => {
    if (!socket || !user) return;

    const onRematch = (payload: ChatGameRematchPayload) => {
      if (payload.fromSessionId !== local.sessionId) return;
      const wasPlayer = payload.session.players.some((player) => player.userId === user.id);
      if (!wasPlayer) return;
      router.replace(`${home}/game/${payload.session.sessionId}`);
    };

    socket.on("chat:game:rematch", onRematch);
    return () => {
      socket.off("chat:game:rematch", onRematch);
    };
  }, [socket, local.sessionId, user, home, router]);

  const applySession = (session: ChatGameSessionSnapshot) => {
    setLocal({
      type: "chat_game",
      sessionId: session.sessionId,
      gameKind: session.kind,
      title: session.title,
      status: session.status,
      hostUserId: session.hostUserId,
      hostFirstName: session.hostFirstName,
      joinPolicy: session.joinPolicy,
      maxPlayers: session.maxPlayers,
      players: session.players,
      spectatorCount: session.spectatorCount,
      matchId: session.matchId ?? undefined,
      text: session.text,
    });
  };

  const isHost = user?.id === local.hostUserId;
  const isPlayer = local.players.some((player) => player.userId === user?.id);
  const isFull = local.players.length >= local.maxPlayers;
  const canJoin = local.status === "lobby" && !isPlayer && !isFull;
  const canHostStart =
    isHost &&
    local.status === "lobby" &&
    local.gameKind === "spinner" &&
    local.players.length >= 2;
  const canCancel =
    (isHost || isPlayer) && (local.status === "lobby" || local.status === "live");
  const canSpectate =
    !isPlayer && (local.status === "live" || (local.status === "lobby" && isFull));
  const focusHref = `${home}/game/${local.sessionId}`;

  const postAction = async (action: string, asSpectator = false) => {
    setBusy(true);
    try {
      const data = await api<{ session: ChatGameSessionSnapshot }>(
        `/chat-games/${local.sessionId}`,
        {
          method: "POST",
          body: JSON.stringify({ action, asSpectator }),
        },
      );
      if (data.session) applySession(data.session);
      return data.session;
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Action failed");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const rematch = async () => {
    const session = await postAction("rematch");
    if (session) router.replace(`${home}/game/${session.sessionId}`);
  };

  const statusLabel =
    local.status === "lobby"
      ? "Waiting"
      : local.status === "live"
        ? "Live"
        : local.status === "ended"
          ? "Finished"
          : "Cancelled";

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
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
          <Button size="sm" disabled={busy} onClick={() => void postAction("start")}>
            Start game
          </Button>
        )}
        {canJoin && (
          <Button size="sm" disabled={busy} onClick={() => void postAction("join")}>
            Join game
          </Button>
        )}
        {(local.status === "live" || local.status === "lobby") && (isPlayer || isHost) && (
          <Link href={focusHref}>
            <Button size="sm" variant={canJoin ? "secondary" : "primary"}>
              {local.status === "live" ? "Play" : "Open lobby"}
            </Button>
          </Link>
        )}
        {canSpectate && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              void (async () => {
                await postAction("join", true);
                router.push(focusHref);
              })();
            }}
          >
            Watch
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void postAction("cancel")}
          >
            Cancel
          </Button>
        )}
        {local.status === "ended" && isPlayer && (
          <Button size="sm" disabled={busy} onClick={() => void rematch()}>
            Rematch
          </Button>
        )}
        {local.status === "ended" && local.matchId && (
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
