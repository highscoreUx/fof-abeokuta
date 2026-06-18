"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUnseenMentionCount } from "@/hooks/useUnseenMentionCount";
import { ChatRoomListSkeleton } from "@/components/chat/ChatRoomListSkeleton";
import {
  countUnseenMessages,
  findLatestGameHint,
  formatRoomMessageTime,
  gameHintFromBody,
  lastRoomMessage,
  roomPreviewText,
} from "@/lib/chat-room-preview";
import { cn } from "@/lib/cn";
import { EMPTY_CHAT_MESSAGES, useChatStore } from "@/stores/chatStore";
import type { ChatRoom, ChatRoomCategory } from "@/types/chat";

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

function ChatRoomRow({
  room,
  active,
  username,
  userId,
  onSelect,
}: {
  room: ChatRoom;
  active: boolean;
  username?: string;
  userId?: string;
  onSelect: (roomId: string) => void;
}) {
  const isPrivate = room.category === "private";
  const messages = useChatStore((state) => state.messagesByRoom[room.id] ?? EMPTY_CHAT_MESSAGES);
  const lastReadAt = useChatStore((state) => state.lastReadAtByRoom[room.id]);
  const liveGame = useChatStore((state) => state.activeGameByRoom[room.id]);
  const unseenMentions = useUnseenMentionCount(room.id, username, isPrivate);
  const unseenMessages =
    userId && !active ? countUnseenMessages(messages, userId, lastReadAt) : 0;

  const lastMessage = lastRoomMessage(messages);
  const preview = roomPreviewText(lastMessage, userId);
  const time = lastMessage ? formatRoomMessageTime(lastMessage.createdAt) : null;

  const gameHint =
    liveGame && userId
      ? gameHintFromBody(
          {
            type: "chat_game",
            sessionId: liveGame.sessionId,
            gameKind: liveGame.kind,
            title: liveGame.title,
            status: liveGame.status,
            hostUserId: liveGame.hostUserId,
            hostFirstName: liveGame.hostFirstName,
            joinPolicy: liveGame.joinPolicy,
            maxPlayers: liveGame.maxPlayers,
            players: liveGame.players,
            spectatorCount: liveGame.spectatorCount,
            matchId: liveGame.matchId ?? undefined,
            text: liveGame.text,
          },
          userId,
        )
      : userId
        ? findLatestGameHint(messages, userId)
        : null;

  const showGameBadge = gameHint?.actionable;
  const gameBadgeLabel =
    gameHint?.status === "live"
      ? "Live"
      : gameHint?.ready
        ? "Ready"
        : "Game";

  return (
    <button
      type="button"
      onClick={() => onSelect(room.id)}
      className={cn(
        "flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-foreground hover:bg-muted",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-xs font-semibold">{room.label}</span>
        <div className="flex shrink-0 items-center gap-1">
          {time && (
            <span
              className={cn(
                "text-[10px] tabular-nums",
                active ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              {time}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-[11px]",
            active ? "text-primary-foreground/85" : "text-muted-foreground",
            unseenMessages > 0 && !active && "font-medium text-foreground",
          )}
        >
          {preview}
        </p>

        <div className="flex shrink-0 items-center gap-1">
          {showGameBadge && !active && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                gameHint?.ready
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : gameHint?.status === "live"
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    : "bg-primary/15 text-primary",
              )}
              aria-label={`${gameBadgeLabel} game`}
            >
              🎮 {gameBadgeLabel}
            </span>
          )}
          {!isPrivate && !active && unseenMentions > 0 && (
            <span
              className="flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
              aria-label={`${unseenMentions} unread mention${unseenMentions === 1 ? "" : "s"}`}
            >
              <span>@</span>
              <span>{unseenMentions}</span>
            </span>
          )}
          {unseenMessages > 0 && !active && (
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
              aria-label={`${unseenMessages} unread message${unseenMessages === 1 ? "" : "s"}`}
            >
              {unseenMessages > 99 ? "99+" : unseenMessages}
            </span>
          )}
        </div>
      </div>
    </button>
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

      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:max-h-none md:flex-none">
        {loading ? (
          <ChatRoomListSkeleton />
        ) : filteredRooms.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground">No chats in this category.</p>
        ) : (
          <div className="space-y-1">
            {filteredRooms.map((room) => (
              <ChatRoomRow
                key={room.id}
                room={room}
                active={room.id === activeRoomId}
                username={user?.username}
                userId={user?.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
