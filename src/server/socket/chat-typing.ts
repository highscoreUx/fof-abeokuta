import { parseDmRoomId } from "@/lib/chat-dm";
import { STAFF_ROOM_ID } from "@/lib/chat-staff";
import { eventRoom, staffRoom, teamRoom, userRoom } from "@/server/socket/rooms";

interface TypingAuth {
  teamId?: string | null;
  teamLetter?: string | null;
}

export function resolveTypingBroadcastRoom(
  eventSlug: string,
  roomId: string,
  auth: TypingAuth,
): string | null {
  if (roomId === "global") return eventRoom(eventSlug);
  if (roomId === STAFF_ROOM_ID) return staffRoom(eventSlug);

  const peerId = parseDmRoomId(roomId);
  if (peerId) return userRoom(peerId);

  if (auth.teamId && auth.teamId === roomId && auth.teamLetter) {
    return teamRoom(eventSlug, auth.teamLetter);
  }

  return null;
}
