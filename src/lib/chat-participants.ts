import type { ChatParticipant } from "@/types/chat";

export const CHAT_PARTICIPANTS_UPSERT_EVENT = "chat:participants:upsert";
export const CHAT_PARTICIPANTS_REMOVE_EVENT = "chat:participants:remove";

export interface ChatParticipantsUpsertPayload {
  roomId: string;
  participant: ChatParticipant;
}

export interface ChatParticipantsRemovePayload {
  roomId: string;
  userId: string;
}

export function sortChatParticipants(list: ChatParticipant[]): ChatParticipant[] {
  return [...list].sort((a, b) => {
    const last = a.lastName.localeCompare(b.lastName);
    return last !== 0 ? last : a.firstName.localeCompare(b.firstName);
  });
}
