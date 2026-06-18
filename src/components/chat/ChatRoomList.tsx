"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUnseenMentionCount } from "@/hooks/useUnseenMentionCount";
import type { ChatRoom, ChatRoomCategory } from "@/types/chat";
import { ChatRoomListSkeleton } from "@/components/chat/ChatRoomListSkeleton";
import { cn } from "@/lib/cn";

type RoomFilter = "all" | ChatRoomCategory;

const FILTERS: Array<{ value: RoomFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "staff", label: "Staff" },
  { value: "team", label: "Team" },
  { value: "private", label: "Private" },
];

interface ChatRoomListProps {
  rooms: ChatRoom[];
  activeRoomId: string;
  loading?: boolean;
  onSelect: (roomId: string) => void;
  className?: string;
}

function ChatRoomMentionBadge({
  room,
  activeRoomId,
  username,
}: {
  room: ChatRoom;
  activeRoomId: string;
  username?: string;
}) {
  const isPrivate = room.category === "private";
  const isActive = room.id === activeRoomId;
  const unseenCount = useUnseenMentionCount(room.id, username, isPrivate);

  if (isPrivate || isActive || unseenCount === 0) return null;

  return (
    <span
      className="flex shrink-0 items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
      aria-label={`${unseenCount} unread mention${unseenCount === 1 ? "" : "s"}`}
    >
      <span>@</span>
      <span>{unseenCount}</span>
    </span>
  );
}

export function ChatRoomList({
  rooms,
  activeRoomId,
  loading = false,
  onSelect,
  className,
}: ChatRoomListProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<RoomFilter>("all");

  const filteredRooms = rooms.filter(
    (room) => filter === "all" || room.category === filter,
  );

  return (
    <div className={cn("flex min-h-0 flex-col flex-1 md:flex-none", className)}>
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

      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:max-h-44 md:flex-none">
        {loading ? (
          <ChatRoomListSkeleton />
        ) : filteredRooms.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">No chats in this category.</p>
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
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <span className="truncate">{room.label}</span>
                  <ChatRoomMentionBadge
                    room={room}
                    activeRoomId={activeRoomId}
                    username={user?.username}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
