import { create } from "zustand";
import type { ChatReplyRef } from "@/lib/chat-reply";
import type { ChatMessage, ChatParticipant } from "@/types/chat";

/** Stable fallbacks for useSyncExternalStore selectors (never use inline `?? []`). */
export const EMPTY_CHAT_MESSAGES: ChatMessage[] = [];
export const EMPTY_CHAT_PARTICIPANTS: ChatParticipant[] = [];

interface ChatStore {
  messagesByRoom: Record<string, ChatMessage[]>;
  participantsByRoom: Record<string, ChatParticipant[]>;
  onlineUserIds: Record<string, boolean>;
  draftsByRoom: Record<string, string>;
  replyToByRoom: Record<string, ChatReplyRef | null>;
  messagesLoaded: Record<string, boolean>;
  participantsLoaded: Record<string, boolean>;
  setMessages: (roomId: string, messages: ChatMessage[]) => void;
  appendMessage: (roomId: string, message: ChatMessage) => void;
  upsertMessage: (roomId: string, message: ChatMessage) => void;
  removeMessage: (roomId: string, messageId: string) => void;
  setParticipants: (roomId: string, participants: ChatParticipant[]) => void;
  setOnlineUserIds: (userIds: string[]) => void;
  patchParticipantOnline: (userId: string, online: boolean) => void;
  setDraft: (roomId: string, draft: string) => void;
  setReplyTo: (roomId: string, reply: ChatReplyRef | null) => void;
  markMessagesLoaded: (roomId: string) => void;
  markParticipantsLoaded: (roomId: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messagesByRoom: {},
  participantsByRoom: {},
  onlineUserIds: {},
  draftsByRoom: {},
  replyToByRoom: {},
  messagesLoaded: {},
  participantsLoaded: {},

  setMessages: (roomId, messages) =>
    set((state) => ({
      messagesByRoom: { ...state.messagesByRoom, [roomId]: messages },
    })),

  appendMessage: (roomId, message) =>
    set((state) => {
      const current = state.messagesByRoom[roomId] ?? [];
      if (current.some((m) => m.id === message.id)) return state;
      return {
        messagesByRoom: { ...state.messagesByRoom, [roomId]: [...current, message] },
      };
    }),

  upsertMessage: (roomId, message) =>
    set((state) => {
      const current = state.messagesByRoom[roomId] ?? [];
      const existingIndex = current.findIndex((m) => m.id === message.id);

      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = message;
        return { messagesByRoom: { ...state.messagesByRoom, [roomId]: next } };
      }

      const pendingIndex = current.findIndex(
        (m) =>
          m.id.startsWith("pending-") &&
          m.body === message.body &&
          m.user.username === message.user.username,
      );

      if (pendingIndex >= 0) {
        const next = [...current];
        next[pendingIndex] = message;
        return { messagesByRoom: { ...state.messagesByRoom, [roomId]: next } };
      }

      return {
        messagesByRoom: { ...state.messagesByRoom, [roomId]: [...current, message] },
      };
    }),

  removeMessage: (roomId, messageId) =>
    set((state) => ({
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: (state.messagesByRoom[roomId] ?? []).filter((m) => m.id !== messageId),
      },
    })),

  setParticipants: (roomId, participants) =>
    set((state) => ({
      participantsByRoom: { ...state.participantsByRoom, [roomId]: participants },
    })),

  setOnlineUserIds: (userIds) =>
    set((state) => {
      const onlineSet = new Set(userIds);
      const onlineUserIds: Record<string, boolean> = {};
      for (const id of userIds) onlineUserIds[id] = true;

      const participantsByRoom: Record<string, ChatParticipant[]> = {};
      for (const [roomId, list] of Object.entries(state.participantsByRoom)) {
        participantsByRoom[roomId] = list.map((person) => ({
          ...person,
          online: onlineSet.has(person.id),
        }));
      }

      return { onlineUserIds, participantsByRoom };
    }),

  patchParticipantOnline: (userId, online) =>
    set((state) => {
      const nextOnline = { ...state.onlineUserIds };
      if (online) nextOnline[userId] = true;
      else delete nextOnline[userId];

      const participantsByRoom: Record<string, ChatParticipant[]> = {};
      for (const [roomId, list] of Object.entries(state.participantsByRoom)) {
        participantsByRoom[roomId] = list.map((person) =>
          person.id === userId ? { ...person, online } : person,
        );
      }

      return { onlineUserIds: nextOnline, participantsByRoom };
    }),

  setDraft: (roomId, draft) =>
    set((state) => ({
      draftsByRoom: { ...state.draftsByRoom, [roomId]: draft },
    })),

  setReplyTo: (roomId, reply) =>
    set((state) => ({
      replyToByRoom: { ...state.replyToByRoom, [roomId]: reply },
    })),

  markMessagesLoaded: (roomId) =>
    set((state) => ({
      messagesLoaded: { ...state.messagesLoaded, [roomId]: true },
    })),

  markParticipantsLoaded: (roomId) =>
    set((state) => ({
      participantsLoaded: { ...state.participantsLoaded, [roomId]: true },
    })),
}));
