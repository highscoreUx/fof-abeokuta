"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { ChatRoom } from "@/types/chat";
import { ChatParticipants } from "@/components/chat/ChatParticipants";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { useChatRealtime } from "@/hooks/useChatRealtime";
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
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list");

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

  useChatRealtime(rooms);

  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setMobilePane("chat");
  };

  const activeRoom = rooms.find((room) => room.id === activeRoomId);

  return (
    <div
      dir="ltr"
      className={cn(
        "grid h-full min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden md:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)] md:gap-4",
        className,
      )}
    >
      <div
        className={cn(
          panelClass,
          "col-start-1 row-start-1 flex h-full min-h-0 flex-col",
          mobilePane === "chat" ? "hidden md:flex" : "flex",
        )}
      >
        <ChatRoomList
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelect={handleSelectRoom}
          className="min-h-0 flex-1 md:flex-none"
        />
        {activeRoom && (
          <ChatParticipants
            key={activeRoom.id}
            room={activeRoom}
            isActive
            className="hidden min-h-0 flex-1 md:flex"
          />
        )}
      </div>

      <div
        className={cn(
          panelClass,
          "col-start-1 row-start-1 flex h-full min-h-0 min-w-0 flex-col md:col-start-2",
          mobilePane === "list" ? "hidden md:flex" : "flex",
        )}
      >
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
              onBack={() => setMobilePane("list")}
              className="h-full min-h-0 flex-1 overflow-hidden"
            />
          ))
        )}
      </div>
    </div>
  );
}
