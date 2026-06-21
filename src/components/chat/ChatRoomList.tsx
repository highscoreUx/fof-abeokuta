"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUnseenMentionCount } from "@/hooks/useUnseenMentionCount";
import { ChatRoomListSkeleton } from "@/components/chat/ChatRoomListSkeleton";
import { MobileTabHeader } from "@/components/layout/MobileTabHeader";
import {
  countUnseenMessages,
  findLatestGameHint,
  formatRoomMessageTime,
  gameHintFromBody,
  lastRoomMessage,
  roomPreviewText,
} from "@/lib/chat-room-preview";
import { roomAvatarColor, roomAvatarLabel } from "@/lib/chat-room-avatar";
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

function ChatRoomAvatar({ room }: { room: ChatRoom }) {
  const color = roomAvatarColor(room);
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white lg:h-10 lg:w-10 lg:text-xs"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {roomAvatarLabel(room)}
    </span>
  );
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
  const hasUnread = unseenMessages > 0 && !active;

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
    gameHint?.status === "live" ? "Live" : gameHint?.ready ? "Ready" : "Game";

  return (
    <button
      type="button"
      onClick={() => onSelect(room.id)}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-muted/80 lg:rounded-lg lg:px-2.5 lg:py-2",
        "border-b border-border/50 lg:border-0",
        active
          ? "bg-muted/40 lg:bg-primary lg:text-primary-foreground lg:shadow-sm"
          : "hover:bg-muted/50 lg:hover:bg-muted",
      )}
    >
      <ChatRoomAvatar room={room} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm font-semibold leading-tight lg:text-xs",
              active && "lg:text-primary-foreground",
            )}
          >
            {room.label}
          </span>
          {time && (
            <span
              className={cn(
                "shrink-0 text-[11px] tabular-nums lg:text-[10px]",
                hasUnread ? "font-medium text-primary lg:text-primary-foreground/80" : "text-muted-foreground",
                active && "lg:text-primary-foreground/80",
              )}
            >
              {time}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-[13px] leading-snug lg:text-[11px]",
              active ? "text-muted-foreground lg:text-primary-foreground/85" : "text-muted-foreground",
              hasUnread && "font-medium text-foreground",
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
            {hasUnread && (
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground"
                aria-label={`${unseenMessages} unread message${unseenMessages === 1 ? "" : "s"}`}
              >
                {unseenMessages > 99 ? "99+" : unseenMessages}
              </span>
            )}
          </div>
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
    <div className={cn("flex min-h-0 flex-col flex-1 bg-card lg:flex-none", className)}>
      <MobileTabHeader title="Chat" className="lg:hidden" />

      <div className="hidden shrink-0 border-b border-border px-4 py-3 lg:block">
        <h3 className="font-semibold text-foreground">Chat</h3>
      </div>

      <div className="shrink-0 border-b border-border/40 bg-card px-4 py-2.5 lg:border-0 lg:px-3 lg:pb-0 lg:pt-3">
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:gap-1.5 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((chip) => {
            const chipActive = filter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setFilter(chip.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition lg:px-2.5 lg:py-1 lg:text-xs",
                  chipActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground lg:hover:text-foreground",
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto lg:max-h-none lg:p-3 lg:flex-none">
        {loading ? (
          <div className="p-3">
            <ChatRoomListSkeleton />
          </div>
        ) : filteredRooms.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">
            No chats in this category.
          </p>
        ) : (
          <div className="lg:space-y-1">
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
