"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSocket, useSocket } from "@/hooks/useSocket";
import { dmRoomIdForMessage } from "@/lib/chat-dm";
import { STAFF_ROOM_ID } from "@/lib/chat-staff";
import { useChatStore } from "@/stores/chatStore";
import type { ChatMessage, ChatRoom } from "@/types/chat";

export function useChatRealtime(
  rooms: ChatRoom[],
  onIncomingDm?: (message: ChatMessage, roomId: string) => void,
) {
  const socket = useSocket();
  const { user } = useAuth();
  const upsertMessage = useChatStore((s) => s.upsertMessage);
  const teamRoomIds = useMemo(
    () => new Set(rooms.filter((room) => room.category === "team").map((room) => room.id)),
    [rooms],
  );
  const dmRoomIds = useMemo(
    () => new Set(rooms.filter((room) => room.category === "private").map((room) => room.id)),
    [rooms],
  );
  const hasStaffRoom = useMemo(
    () => rooms.some((room) => room.id === STAFF_ROOM_ID),
    [rooms],
  );

  useEffect(() => {
    const instance = getSocket() ?? socket;
    if (!instance) return;

    const onGlobal = (msg: ChatMessage) => {
      if (msg.recipientId || msg.staffChannel) return;
      upsertMessage("global", msg);
    };

    const onStaff = (msg: ChatMessage) => {
      if (!hasStaffRoom) return;
      upsertMessage(STAFF_ROOM_ID, msg);
    };

    const onTeam = (msg: ChatMessage) => {
      if (!msg.teamId || !teamRoomIds.has(msg.teamId)) return;
      upsertMessage(msg.teamId, msg);
    };

    const onDm = (msg: ChatMessage) => {
      if (!user?.id) return;
      const roomId = dmRoomIdForMessage(msg, user.id);
      if (!roomId) return;
      upsertMessage(roomId, msg);
      if (!dmRoomIds.has(roomId)) {
        onIncomingDm?.(msg, roomId);
      }
    };

    const onPollUpdate = (msg: ChatMessage) => {
      if (msg.recipientId && user?.id) {
        const roomId = dmRoomIdForMessage(msg, user.id);
        if (roomId) {
          upsertMessage(roomId, msg);
        }
        return;
      }
      if (msg.staffChannel && hasStaffRoom) {
        upsertMessage(STAFF_ROOM_ID, msg);
        return;
      }
      if (msg.teamId && teamRoomIds.has(msg.teamId)) {
        upsertMessage(msg.teamId, msg);
        return;
      }
      if (!msg.teamId && !msg.recipientId && !msg.staffChannel) {
        upsertMessage("global", msg);
      }
    };

    instance.on("global:message", onGlobal);
    instance.on("staff:message", onStaff);
    instance.on("team:message", onTeam);
    instance.on("dm:message", onDm);
    instance.on("poll:update", onPollUpdate);

    return () => {
      instance.off("global:message", onGlobal);
      instance.off("staff:message", onStaff);
      instance.off("team:message", onTeam);
      instance.off("dm:message", onDm);
      instance.off("poll:update", onPollUpdate);
    };
  }, [socket, teamRoomIds, dmRoomIds, hasStaffRoom, upsertMessage, user?.id, onIncomingDm]);
}
