"use client";

import { useEffect, useMemo } from "react";
import { getSocket, useSocket } from "@/hooks/useSocket";
import { useChatStore } from "@/stores/chatStore";
import type { ChatMessage, ChatRoom } from "@/types/chat";

export function useChatRealtime(rooms: ChatRoom[]) {
  const socket = useSocket();
  const upsertMessage = useChatStore((s) => s.upsertMessage);
  const teamRoomIds = useMemo(
    () => new Set(rooms.filter((room) => room.category === "team").map((room) => room.id)),
    [rooms],
  );

  useEffect(() => {
    const instance = getSocket() ?? socket;
    if (!instance) return;

    const onGlobal = (msg: ChatMessage) => {
      upsertMessage("global", msg);
    };

    const onTeam = (msg: ChatMessage) => {
      if (!msg.teamId || !teamRoomIds.has(msg.teamId)) return;
      upsertMessage(msg.teamId, msg);
    };

    const onPollUpdate = (msg: ChatMessage) => {
      if (msg.teamId && teamRoomIds.has(msg.teamId)) {
        upsertMessage(msg.teamId, msg);
        return;
      }
      if (!msg.teamId) {
        upsertMessage("global", msg);
      }
    };

    instance.on("global:message", onGlobal);
    instance.on("team:message", onTeam);
    instance.on("poll:update", onPollUpdate);

    return () => {
      instance.off("global:message", onGlobal);
      instance.off("team:message", onTeam);
      instance.off("poll:update", onPollUpdate);
    };
  }, [socket, teamRoomIds, upsertMessage]);
}
