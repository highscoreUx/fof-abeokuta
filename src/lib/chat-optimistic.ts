import { parseDmRoomId } from "@/lib/chat-dm";
import { STAFF_ROOM_ID } from "@/lib/chat-staff";
import type { AuthUser } from "@/types";
import type { ChatMessage, ChatRoom } from "@/types/chat";

export function createOptimisticChatMessage(
  body: string,
  user: AuthUser,
  room: ChatRoom,
): ChatMessage {
  const peerId = room.category === "private" ? parseDmRoomId(room.id) : null;

  return {
    id: `pending-${crypto.randomUUID()}`,
    body,
    createdAt: new Date().toISOString(),
    userId: user.id,
    ...(room.category === "team" ? { teamId: room.id } : {}),
    ...(room.id === STAFF_ROOM_ID || room.category === "staff" ? { staffChannel: true } : {}),
    ...(peerId ? { recipientId: peerId } : {}),
    user: {
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
}
