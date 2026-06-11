"use client";

import { useState } from "react";
import type { ChatRoom, ChatRoomCategory } from "@/components/chat/ChatPanel";
import { cn } from "@/lib/cn";

type RoomFilter = "all" | ChatRoomCategory;

const FILTERS: Array<{ value: RoomFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "team", label: "Team" },
  { value: "private", label: "Private" },
];

interface ChatRoomListProps {
  rooms: ChatRoom[];
  activeRoomId: string;
  onSelect: (roomId: string) => void;
  className?: string;
}

export function ChatRoomList({ rooms, activeRoomId, onSelect, className }: ChatRoomListProps) {
  const [filter, setFilter] = useState<RoomFilter>("all");

  const filteredRooms = rooms.filter(
    (room) => filter === "all" || room.category === filter,
  );

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h3 className="font-semibold text-foreground">Chats</h3>
      </div>

      <div className="shrink-0 px-3 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((chip) => {
            const active = filter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setFilter(chip.value)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto p-3">
        {filteredRooms.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">No chats in this category.</p>
        ) : (
          <div className="space-y-1">
            {filteredRooms.map((room) => {
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}
