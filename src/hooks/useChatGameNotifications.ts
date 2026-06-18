"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { roomIdForGameSession } from "@/lib/chat-game-room";
import { gameHintFromBody } from "@/lib/chat-room-preview";
import type { ChatGameSessionSnapshot } from "@/lib/chat-game-types";
import { toastSuccess } from "@/lib/toast";
import { useChatStore } from "@/stores/chatStore";

function snapshotToGameBody(snapshot: ChatGameSessionSnapshot) {
  return {
    type: "chat_game" as const,
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
  };
}

export function useChatGameNotifications(activeRoomId: string) {
  const { user } = useAuth();
  const socket = useSocket();
  const setActiveGameForRoom = useChatStore((state) => state.setActiveGameForRoom);
  const notifiedRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!socket || !user) return;

    const onState = (snapshot: ChatGameSessionSnapshot) => {
      const roomId = roomIdForGameSession(snapshot, user.id);
      if (!roomId) return;

      if (snapshot.status === "lobby" || snapshot.status === "live") {
        setActiveGameForRoom(roomId, snapshot);
      } else {
        setActiveGameForRoom(roomId, null);
      }

      if (roomId === activeRoomId) return;

      const gameBody = snapshotToGameBody(snapshot);
      const hint = gameHintFromBody(gameBody, user.id);
      if (!hint?.actionable) return;

      const isPlayer = snapshot.players.some((player) => player.userId === user.id);
      const isHost = snapshot.hostUserId === user.id;
      const isFull = snapshot.players.length >= snapshot.maxPlayers;

      let notifyKey: string | null = null;
      let title = "";
      let description = snapshot.text;

      if (snapshot.status === "live" && isPlayer) {
        notifyKey = `live:${snapshot.sessionId}`;
        title = "Game started!";
      } else if (snapshot.status === "lobby" && isHost && snapshot.kind === "spinner" && snapshot.players.length >= 2) {
        notifyKey = `start:${snapshot.sessionId}:${snapshot.players.length}`;
        title = "You can start the game";
        description = `${snapshot.title} — ${snapshot.players.length} player${snapshot.players.length === 1 ? "" : "s"} joined`;
      } else if (snapshot.status === "lobby" && isFull && isPlayer) {
        notifyKey = `ready:${snapshot.sessionId}`;
        title = "Ready to play!";
        description = `${snapshot.title} is waiting in chat`;
      } else if (snapshot.status === "lobby" && isFull && isHost && snapshot.kind !== "spinner") {
        notifyKey = `ready-host:${snapshot.sessionId}`;
        title = "Ready to play!";
        description = `${snapshot.title} lobby is full`;
      } else if (snapshot.status === "lobby" && !isPlayer && snapshot.joinPolicy === "open" && !isFull) {
        notifyKey = `join:${snapshot.sessionId}:${snapshot.players.length}`;
        title = "Game lobby open";
      }

      if (!notifyKey || notifiedRef.current.get(snapshot.sessionId) === notifyKey) return;
      notifiedRef.current.set(snapshot.sessionId, notifyKey);
      toastSuccess(title, description);
    };

    socket.on("chat:game:state", onState);
    return () => {
      socket.off("chat:game:state", onState);
    };
  }, [socket, user, activeRoomId, setActiveGameForRoom]);
}
