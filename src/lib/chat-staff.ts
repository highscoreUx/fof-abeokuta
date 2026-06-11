export const STAFF_ROOM_ID = "staff";

export const STAFF_CHAT_ROLE_SLUGS = ["event_admin", "coordinator", "staff"] as const;

export function isStaffRoomId(roomId: string) {
  return roomId === STAFF_ROOM_ID;
}
