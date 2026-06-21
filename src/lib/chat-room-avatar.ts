import type { ChatRoom } from "@/types/chat";
import { nameColorForUser } from "@/lib/chat-display";

export function roomAvatarLabel(room: ChatRoom) {
  if (room.category === "team" && room.letter) return room.letter.toUpperCase();
  if (room.category === "general") return "#";
  if (room.category === "staff") return "S";
  const parts = room.label.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  }
  return room.label.slice(0, 2).toUpperCase();
}

export function roomAvatarColor(room: ChatRoom) {
  return nameColorForUser(room.id);
}
