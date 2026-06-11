"use client";

import type { ChatRoom } from "@/components/chat/ChatPanel";
import { cn } from "@/lib/cn";

interface ChatRoomListProps {
  rooms: ChatRoom[];
  activeRoomId: string;
  onSelect: (roomId: string) => void;
  className?: string;
}

export function ChatRoomList({ rooms, activeRoomId, onSelect, className }: ChatRoomListProps) {
  const globalRooms = rooms.filter((room) => room.type === "global");
  const teamRooms = rooms.filter((room) => room.type === "team");

  const roomButton = (room: ChatRoom) => {
    const active = room.id === activeRoomId;
    return (
      <button
        key={room.id}
        type="button"
        onClick={() => onSelect(room.id)}
        className={cn(
          "w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-foreground hover:bg-muted",
        )}
      >
        {room.label}
      </button>
    );
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h3 className="font-semibold text-foreground">Chats</h3>
        <p className="text-sm text-muted-foreground">Pick a room</p>
      </div>

      <div className="max-h-48 overflow-y-auto p-3">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Global
        </p>
        <div className="mb-5 space-y-1">{globalRooms.map(roomButton)}</div>

        {teamRooms.length > 0 && (
          <>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Teams
            </p>
            <div className="space-y-1">{teamRooms.map(roomButton)}</div>
          </>
        )}
      </div>
    </div>
  );
}
