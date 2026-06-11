export const CHAT_TYPING_EVENT = "chat:typing";

export const TYPING_TTL_MS = 4000;
export const TYPING_EMIT_DEBOUNCE_MS = 300;
export const TYPING_STOP_IDLE_MS = 2500;

export interface ChatTypingPayload {
  roomId: string;
  userId: string;
  firstName: string;
  lastName: string;
  isTyping: boolean;
}

export interface ChatTypingEmitPayload {
  roomId: string;
  isTyping: boolean;
}

export interface ChatTyper {
  userId: string;
  firstName: string;
  lastName: string;
}

export function formatTypingLabel(typers: ChatTyper[]): string | null {
  if (typers.length === 0) return null;
  if (typers.length === 1) {
    return `${typers[0].firstName} is typing…`;
  }
  if (typers.length === 2) {
    return `${typers[0].firstName} and ${typers[1].firstName} are typing…`;
  }
  return `${typers[0].firstName} and ${typers.length - 1} others are typing…`;
}
