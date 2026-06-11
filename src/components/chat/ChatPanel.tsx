"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { EMPTY_CHAT_MESSAGES, useChatStore } from "@/stores/chatStore";

export interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  teamId?: string;
  user: { username: string; firstName: string; lastName: string };
}

export type ChatRoomCategory = "general" | "team" | "private";

export interface ChatRoom {
  id: string;
  category: ChatRoomCategory;
  label: string;
  letter?: string;
  name?: string;
}

interface ChatPanelProps {
  room: ChatRoom;
  isActive: boolean;
  className?: string;
}

export function ChatPanel({ room, isActive, className }: ChatPanelProps) {
  const { api } = useEventApi();
  const socket = useSocket();
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useChatStore((s) => s.messagesByRoom[room.id] ?? EMPTY_CHAT_MESSAGES);
  const draft = useChatStore((s) => s.draftsByRoom[room.id] ?? "");
  const messagesLoaded = useChatStore((s) => s.messagesLoaded[room.id] ?? false);
  const setMessages = useChatStore((s) => s.setMessages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const setDraft = useChatStore((s) => s.setDraft);
  const markMessagesLoaded = useChatStore((s) => s.markMessagesLoaded);

  const isGeneral = room.category === "general";
  const messagePath = isGeneral ? "/messages/global" : `/messages/${room.id}`;
  const socketEvent = isGeneral ? "global:message" : "team:message";
  const emitEvent = isGeneral ? "global:message" : "team:message";

  useEffect(() => {
    if (messagesLoaded) return;

    api<{ messages: ChatMessage[] }>(messagePath)
      .then((data) => {
        setMessages(room.id, data.messages);
        markMessagesLoaded(room.id);
      })
      .catch(() => {
        setMessages(room.id, []);
        markMessagesLoaded(room.id);
      });
  }, [api, messagePath, room.id, messagesLoaded, setMessages, markMessagesLoaded]);

  useEffect(() => {
    if (!socket) return;

    const handler = (msg: ChatMessage) => {
      if (room.category === "team" && msg.teamId && msg.teamId !== room.id) return;
      appendMessage(room.id, msg);
    };

    socket.on(socketEvent, handler);
    return () => {
      socket.off(socketEvent, handler);
    };
  }, [socket, socketEvent, room.id, room.category, appendMessage]);

  useEffect(() => {
    if (!isActive) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isActive]);

  const send = () => {
    if (!draft.trim() || !socket) return;
    socket.emit(emitEvent, draft.trim());
    setDraft(room.id, "");
  };

  const placeholder =
    isGeneral
      ? "Message everyone..."
      : room.category === "private"
        ? "Send a private message..."
        : `Message Team ${room.letter ?? ""}...`;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        !isActive && "hidden",
        className,
      )}
      aria-hidden={!isActive}
    >
      <div className="shrink-0 border-b border-border px-4 py-3 sm:px-6">
        <h3 className="font-semibold text-foreground">{room.label}</h3>
        {room.category === "team" && room.name && (
          <p className="text-sm text-muted-foreground">{room.name}</p>
        )}
        {isGeneral && (
          <p className="text-sm text-muted-foreground">Event-wide conversation</p>
        )}
        {room.category === "private" && (
          <p className="text-sm text-muted-foreground">Direct message</p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:px-6">
        {!messagesLoaded ? (
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                {m.user.firstName} {m.user.lastName}
              </p>
              <p className="text-foreground">{m.body}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border px-4 py-4 sm:px-6">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(room.id, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={placeholder}
          />
          <Button onClick={send}>Send</Button>
        </div>
      </div>
    </div>
  );
}
