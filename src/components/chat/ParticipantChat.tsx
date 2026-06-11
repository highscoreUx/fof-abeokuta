"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { ChatRoom } from "@/types/chat";
import { ChatParticipants } from "@/components/chat/ChatParticipants";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { useEventApi } from "@/hooks/useEventApi";
import { cn } from "@/lib/cn";

interface ParticipantChatProps {
  className?: string;
}

const panelClass =
  "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]";

export function ParticipantChat({ className }: ParticipantChatProps) {
  const { api } = useEventApi();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>("global");

  useEffect(() => {
    api<{ rooms: ChatRoom[] }>("/chat/rooms")
      .then((data) => {
        setRooms(data.rooms);
        setActiveRoomId((current) =>
          data.rooms.some((room) => room.id === current)
            ? current
            : (data.rooms[0]?.id ?? "global"),
        );
      })
      .catch(() => setRooms([{ id: "global", category: "general", label: "General" }]));
  }, [api]);

  return (
    <div
      dir="ltr"
      className={cn(
        "grid min-h-0 flex-1 grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)] gap-4",
        className,
      )}
    >
      <div className={cn(panelClass, "col-start-1 row-start-1 flex min-h-0 flex-col")}>
        <ChatRoomList
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelect={setActiveRoomId}
          className="shrink-0"
        />
        {rooms.map((room) => (
          <ChatParticipants
            key={room.id}
            room={room}
            isActive={room.id === activeRoomId}
          />
        ))}
      </div>

      <div className={cn(panelClass, "col-start-2 row-start-1 min-h-0 min-w-0")}>
        {rooms.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            No chat rooms available.
          </div>
        ) : (
          rooms.map((room) => (
            <ChatPanel
              key={room.id}
              room={room}
              isActive={room.id === activeRoomId}
              className="min-h-0 flex-1"
            />
          ))
        )}
      </div>
    </div>
  );
}
