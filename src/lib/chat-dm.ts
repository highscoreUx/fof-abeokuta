export const DM_ROOM_PREFIX = "dm:";

export function dmRoomId(userId: string) {
  return `${DM_ROOM_PREFIX}${userId}`;
}

export function parseDmRoomId(roomId: string): string | null {
  if (!roomId.startsWith(DM_ROOM_PREFIX)) return null;
  const userId = roomId.slice(DM_ROOM_PREFIX.length);
  return userId || null;
}

export function isDmRoomId(roomId: string) {
  return roomId.startsWith(DM_ROOM_PREFIX);
}

export function dmPeerIdFromMessage(
  message: { userId?: string; recipientId?: string },
  myUserId: string,
): string | null {
  if (!message.recipientId || !message.userId) return null;
  return message.userId === myUserId ? message.recipientId : message.userId;
}

export function dmRoomIdForMessage(
  message: { userId?: string; recipientId?: string },
  myUserId: string,
): string | null {
  const peerId = dmPeerIdFromMessage(message, myUserId);
  return peerId ? dmRoomId(peerId) : null;
}
