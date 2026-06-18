"use client";

import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSocket, useSocket } from "@/hooks/useSocket";
import { dmRoomIdForMessage } from "@/lib/chat-dm";
import { STAFF_ROOM_ID } from "@/lib/chat-staff";
import { CHAT_SYSTEM_EVENT, type ChatSystemBroadcast } from "@/lib/chat-system";
import { clearPendingChatGameMessages } from "@/lib/chat-pending-games";
import {
  CHAT_PARTICIPANTS_REMOVE_EVENT,
  CHAT_PARTICIPANTS_UPSERT_EVENT,
  type ChatParticipantsRemovePayload,
  type ChatParticipantsUpsertPayload,
} from "@/lib/chat-participants";
import { useChatStore } from "@/stores/chatStore";
import type { ChatMessage, ChatRoom } from "@/types/chat";

export function useChatRealtime(
  rooms: ChatRoom[],
  onIncomingDm?: (message: ChatMessage, roomId: string) => void,
) {
  const socket = useSocket();
  const { user } = useAuth();
  const upsertMessage = useChatStore((s) => s.upsertMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const setOnlineUserIds = useChatStore((s) => s.setOnlineUserIds);
  const upsertParticipant = useChatStore((s) => s.upsertParticipant);
  const removeParticipant = useChatStore((s) => s.removeParticipant);

  const upsertChatMessage = (roomId: string, msg: ChatMessage) => {
    const messages = useChatStore.getState().messagesByRoom[roomId] ?? [];
    for (const pendingId of clearPendingChatGameMessages(messages, msg.body)) {
      removeMessage(roomId, pendingId);
    }
    upsertMessage(roomId, msg);
  };
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
      upsertChatMessage("global", msg);
    };

    const onStaff = (msg: ChatMessage) => {
      if (!hasStaffRoom) return;
      upsertChatMessage(STAFF_ROOM_ID, msg);
    };

    const onTeam = (msg: ChatMessage) => {
      if (!msg.teamId || !teamRoomIds.has(msg.teamId)) return;
      upsertChatMessage(msg.teamId, msg);
    };

    const onDm = (msg: ChatMessage) => {
      if (!user?.id) return;
      const roomId = dmRoomIdForMessage(msg, user.id);
      if (!roomId) return;
      upsertChatMessage(roomId, msg);
      if (!dmRoomIds.has(roomId)) {
        onIncomingDm?.(msg, roomId);
      }
    };

    const onPollUpdate = (msg: ChatMessage) => {
      if (msg.recipientId && user?.id) {
        const roomId = dmRoomIdForMessage(msg, user.id);
        if (roomId) {
          upsertChatMessage(roomId, msg);
        }
        return;
      }
      if (msg.staffChannel && hasStaffRoom) {
        upsertChatMessage(STAFF_ROOM_ID, msg);
        return;
      }
      if (msg.teamId && teamRoomIds.has(msg.teamId)) {
        upsertChatMessage(msg.teamId, msg);
        return;
      }
      if (!msg.teamId && !msg.recipientId && !msg.staffChannel) {
        upsertChatMessage("global", msg);
      }
    };

    const onSystem = (payload: ChatSystemBroadcast) => {
      if (!payload.targetRoomId) return;
      if (payload.targetRoomId === STAFF_ROOM_ID && !hasStaffRoom) return;
      if (payload.targetRoomId !== "global" && payload.targetRoomId !== STAFF_ROOM_ID) {
        if (!teamRoomIds.has(payload.targetRoomId)) return;
      }
      upsertChatMessage(payload.targetRoomId, payload);
    };

    const onPresenceState = (payload: { onlineUserIds: string[] }) => {
      if (Array.isArray(payload.onlineUserIds)) {
        setOnlineUserIds(payload.onlineUserIds);
      }
    };

    const onPresenceUpdate = (payload: { onlineUserIds: string[] }) => {
      if (Array.isArray(payload.onlineUserIds)) {
        setOnlineUserIds(payload.onlineUserIds);
      }
    };

    const onParticipantsUpsert = (payload: ChatParticipantsUpsertPayload) => {
      if (!payload?.roomId || !payload.participant?.id) return;
      upsertParticipant(payload.roomId, payload.participant);
    };

    const onParticipantsRemove = (payload: ChatParticipantsRemovePayload) => {
      if (!payload?.roomId || !payload.userId) return;
      removeParticipant(payload.roomId, payload.userId);
    };

    instance.on("global:message", onGlobal);
    instance.on("staff:message", onStaff);
    instance.on("team:message", onTeam);
    instance.on("dm:message", onDm);
    instance.on("poll:update", onPollUpdate);
    instance.on(CHAT_SYSTEM_EVENT, onSystem);
    instance.on("presence:state", onPresenceState);
    instance.on("presence:update", onPresenceUpdate);
    instance.on(CHAT_PARTICIPANTS_UPSERT_EVENT, onParticipantsUpsert);
    instance.on(CHAT_PARTICIPANTS_REMOVE_EVENT, onParticipantsRemove);

    return () => {
      instance.off("global:message", onGlobal);
      instance.off("staff:message", onStaff);
      instance.off("team:message", onTeam);
      instance.off("dm:message", onDm);
      instance.off("poll:update", onPollUpdate);
      instance.off(CHAT_SYSTEM_EVENT, onSystem);
      instance.off("presence:state", onPresenceState);
      instance.off("presence:update", onPresenceUpdate);
      instance.off(CHAT_PARTICIPANTS_UPSERT_EVENT, onParticipantsUpsert);
      instance.off(CHAT_PARTICIPANTS_REMOVE_EVENT, onParticipantsRemove);
    };
  }, [
    socket,
    teamRoomIds,
    dmRoomIds,
    hasStaffRoom,
    upsertMessage,
    removeMessage,
    upsertChatMessage,
    setOnlineUserIds,
    upsertParticipant,
    removeParticipant,
    user?.id,
    onIncomingDm,
  ]);
}
