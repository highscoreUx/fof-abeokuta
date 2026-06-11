"use client";

import { useEffect, useState } from "react";
import { ChatPanel, type ChatRoom } from "@/components/chat/ChatPanel";
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

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];

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
        {activeRoom && <ChatParticipants room={activeRoom} />}
      </div>

      <div className={cn(panelClass, "col-start-2 row-start-1 min-h-0 min-w-0")}>
        {activeRoom ? (
          <ChatPanel key={activeRoom.id} room={activeRoom} className="min-h-0 flex-1" />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            No chat rooms available.
          </div>
        )}
      </div>
    </div>
  );
}
