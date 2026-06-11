import type { AuthUser } from "@/types";
import type { ChatMessage, ChatRoom } from "@/types/chat";

export function createOptimisticChatMessage(
  body: string,
  user: AuthUser,
  room: ChatRoom,
): ChatMessage {
  return {
    id: `pending-${crypto.randomUUID()}`,
    body,
    createdAt: new Date().toISOString(),
    ...(room.category === "team" ? { teamId: room.id } : {}),
    user: {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
}
