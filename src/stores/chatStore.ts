import { create } from "zustand";
import type { ChatMessage } from "@/components/chat/ChatPanel";
import type { ChatParticipant } from "@/components/chat/ChatParticipants";

/** Stable fallbacks for useSyncExternalStore selectors (never use inline `?? []`). */
export const EMPTY_CHAT_MESSAGES: ChatMessage[] = [];
export const EMPTY_CHAT_PARTICIPANTS: ChatParticipant[] = [];

interface ChatStore {
  messagesByRoom: Record<string, ChatMessage[]>;
  participantsByRoom: Record<string, ChatParticipant[]>;
  draftsByRoom: Record<string, string>;
  messagesLoaded: Record<string, boolean>;
  participantsLoaded: Record<string, boolean>;
  setMessages: (roomId: string, messages: ChatMessage[]) => void;
  appendMessage: (roomId: string, message: ChatMessage) => void;
  setParticipants: (roomId: string, participants: ChatParticipant[]) => void;
  setDraft: (roomId: string, draft: string) => void;
  markMessagesLoaded: (roomId: string) => void;
  markParticipantsLoaded: (roomId: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messagesByRoom: {},
  participantsByRoom: {},
  draftsByRoom: {},
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

  setParticipants: (roomId, participants) =>
    set((state) => ({
      participantsByRoom: { ...state.participantsByRoom, [roomId]: participants },
    })),

  setDraft: (roomId, draft) =>
    set((state) => ({
      draftsByRoom: { ...state.draftsByRoom, [roomId]: draft },
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
