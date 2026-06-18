import { dmRoomId } from "@/lib/chat-dm";
import type { ChatGameSessionSnapshot } from "@/lib/chat-game-types";
import { STAFF_ROOM_ID } from "@/lib/chat-staff";

export function roomIdForGameSession(
  snapshot: ChatGameSessionSnapshot,
  userId: string,
): string | null {
  switch (snapshot.channel) {
    case "DM": {
      const peerId =
        snapshot.hostUserId === userId
          ? snapshot.dmPeerUserId
          : snapshot.hostUserId;
      return peerId ? dmRoomId(peerId) : null;
    }
    case "TEAM":
      return snapshot.teamId;
    case "STAFF":
      return STAFF_ROOM_ID;
    case "GENERAL":
      return "global";
    default:
      return null;
  }
}
