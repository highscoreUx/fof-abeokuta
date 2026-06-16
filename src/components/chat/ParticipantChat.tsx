"use client";

import { useCallback } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { ChatMessage } from "@/types/chat";
import { ChatParticipants } from "@/components/chat/ChatParticipants";
import { ChatRoomList } from "@/components/chat/ChatRoomList";
import { ChatRoomListSkeleton } from "@/components/chat/ChatRoomListSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useChatRealtime } from "@/hooks/useChatRealtime";
import { useChatRooms } from "@/hooks/useChatRooms";
import { dmRoomId, parseDmRoomId } from "@/lib/chat-dm";
import { cn } from "@/lib/cn";
import { useChatStore } from "@/stores/chatStore";

interface ParticipantChatProps {
  className?: string;
}

const panelClass =
  "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]";

export function ParticipantChat({ className }: ParticipantChatProps) {
  const { user } = useAuth();
  const { rooms, roomsLoading } = useChatRooms();
  const activeRoomId = useChatStore((state) => state.activeRoomId);
  const mobilePane = useChatStore((state) => state.mobilePane);
  const addChatRoom = useChatStore((state) => state.addChatRoom);
  const setActiveRoomId = useChatStore((state) => state.setActiveRoomId);
  const setMobilePane = useChatStore((state) => state.setMobilePane);

  const handleIncomingDm = useCallback(
    (message: ChatMessage, roomId: string) => {
      const peerId = parseDmRoomId(roomId);
      if (!peerId || !user?.id) return;

      const label =
        message.userId === user.id
          ? rooms.find((room) => room.id === roomId)?.label ?? "Direct message"
          : `${message.user.firstName} ${message.user.lastName}`;

      addChatRoom({ id: roomId, category: "private", label });
    },
    [addChatRoom, rooms, user?.id],
  );

  useChatRealtime(rooms, handleIncomingDm);

  const openPrivateChat = useCallback(
    (message: ChatMessage) => {
      const peerId = message.userId;
      if (!peerId) return;

      const roomId = dmRoomId(peerId);
      const label = `${message.user.firstName} ${message.user.lastName}`;

      addChatRoom({ id: roomId, category: "private", label });
      setActiveRoomId(roomId);
      setMobilePane("chat");
    },
    [addChatRoom, setActiveRoomId, setMobilePane],
  );

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
          loading={roomsLoading}
          onSelect={handleSelectRoom}
          className="min-h-0 flex-1 md:flex-none"
        />
        {activeRoom && !roomsLoading && (
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
        {roomsLoading ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
            Loading chats…
          </div>
        ) : rooms.length === 0 ? (
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
              onMessagePrivately={openPrivateChat}
              className="h-full min-h-0 flex-1 overflow-hidden"
            />
          ))
        )}
      </div>
    </div>
  );
}
