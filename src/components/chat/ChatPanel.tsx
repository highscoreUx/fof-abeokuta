"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventSlug } from "@/hooks/useEventSlug";
import { getSocket, isSocketConnected, useSocket } from "@/hooks/useSocket";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";
import { ChatSystemMessage } from "@/components/chat/ChatSystemMessage";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useChatTyping } from "@/hooks/useChatTyping";
import { isSystemChatMessage } from "@/lib/chat-system";
import { parseDmRoomId } from "@/lib/chat-dm";
import { STAFF_ROOM_ID } from "@/lib/chat-staff";
import { isSameMessageGroup } from "@/lib/chat-display";
import { roomAvatarColor, roomAvatarLabel } from "@/lib/chat-room-avatar";
import { cn } from "@/lib/cn";
import type { ChatContent } from "@/lib/chat-content";
import { parseChatContent, serializeChatContent } from "@/lib/chat-content";
import { findMessagesMentioningUser } from "@/lib/chat-mentions";
import { createOptimisticChatMessage } from "@/lib/chat-optimistic";
import { buildReplyRef } from "@/lib/chat-reply";
import {
  EMPTY_CHAT_MESSAGES,
  EMPTY_CHAT_PARTICIPANTS,
  EMPTY_SEEN_MENTION_IDS,
  useChatStore,
} from "@/stores/chatStore";
import type { ChatMessage, ChatParticipant, ChatRoom } from "@/types/chat";

export type { ChatMessage, ChatRoom, ChatRoomCategory } from "@/types/chat";

interface ChatPanelProps {
  room: ChatRoom;
  isActive: boolean;
  onBack?: () => void;
  onMessagePrivately?: (message: ChatMessage) => void;
  className?: string;
}

type SocketAck = { message?: ChatMessage; error?: string };

export function ChatPanel({
  room,
  isActive,
  onBack,
  onMessagePrivately,
  className,
}: ChatPanelProps) {
  const { api } = useEventApi();
  const eventSlug = useEventSlug();
  const { user } = useAuth();
  const socket = useSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const seenMentionIds = useChatStore(
    (s) => s.seenMentionIdsByRoom[room.id] ?? EMPTY_SEEN_MENTION_IDS,
  );
  const markMentionSeen = useChatStore((s) => s.markMentionSeen);
  const [dmGamesEnabled, setDmGamesEnabled] = useState(false);
  const [teamGamesEnabled, setTeamGamesEnabled] = useState(false);

  const messages = useChatStore((s) => s.messagesByRoom[room.id] ?? EMPTY_CHAT_MESSAGES);
  const draft = useChatStore((s) => s.draftsByRoom[room.id] ?? "");
  const replyTo = useChatStore((s) => s.replyToByRoom[room.id] ?? null);
  const messagesLoaded = useChatStore((s) => s.messagesLoaded[room.id] ?? false);
  const participants = useChatStore(
    (s) => s.participantsByRoom[room.id] ?? EMPTY_CHAT_PARTICIPANTS,
  );
  const participantsLoaded = useChatStore((s) => s.participantsLoaded[room.id] ?? false);
  const setParticipants = useChatStore((s) => s.setParticipants);
  const markParticipantsLoaded = useChatStore((s) => s.markParticipantsLoaded);
  const setMessages = useChatStore((s) => s.setMessages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const upsertMessage = useChatStore((s) => s.upsertMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const setDraft = useChatStore((s) => s.setDraft);
  const setReplyTo = useChatStore((s) => s.setReplyTo);
  const markMessagesLoaded = useChatStore((s) => s.markMessagesLoaded);
  const markRoomRead = useChatStore((s) => s.markRoomRead);

  const peerId = room.category === "private" ? parseDmRoomId(room.id) : null;
  const isGeneral = room.category === "general";
  const isPrivate = room.category === "private";
  const isStaff = room.category === "staff" || room.id === STAFF_ROOM_ID;
  const messagePath = isGeneral
    ? "/messages/global"
    : isStaff
      ? "/messages/staff"
      : isPrivate && peerId
        ? `/messages/dm/${peerId}`
        : `/messages/${room.id}`;

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
    if (isPrivate || participantsLoaded) return;

    api<{ participants: ChatParticipant[] }>(
      `/chat/rooms/${room.id}/participants`,
    )
      .then((data) => {
        setParticipants(room.id, data.participants);
        markParticipantsLoaded(room.id);
      })
      .catch(() => {
        setParticipants(room.id, []);
        markParticipantsLoaded(room.id);
      });
  }, [
    api,
    isPrivate,
    participantsLoaded,
    room.id,
    setParticipants,
    markParticipantsLoaded,
  ]);

  useEffect(() => {
    api<{ settings: { enabled: boolean; dmEnabled: boolean; teamEnabled: boolean } }>(
      "/chat-games/settings",
    )
      .then((data) => {
        setDmGamesEnabled(data.settings.enabled && data.settings.dmEnabled);
        setTeamGamesEnabled(data.settings.enabled && data.settings.teamEnabled);
      })
      .catch(() => {
        setDmGamesEnabled(false);
        setTeamGamesEnabled(false);
      });
  }, [api]);

  useEffect(() => {
    if (!isActive) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    markRoomRead(room.id);
  }, [messages, isActive, markRoomRead, room.id]);

  useEffect(
    () => () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    },
    [],
  );

  const scrollToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current.get(messageId);
    const container = scrollContainerRef.current;
    if (!element || !container) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const offset = elementRect.top - containerRect.top + container.scrollTop;
    const targetScroll =
      offset - container.clientHeight / 2 + element.clientHeight / 2;

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: "smooth",
    });

    setHighlightedMessageId(messageId);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
      highlightTimeoutRef.current = null;
    }, 1400);
  }, []);

  const mentionMessageIds = useMemo(() => {
    if (!user?.username || isPrivate) return [];
    return findMessagesMentioningUser(messages, user.username, (body) => parseChatContent(body));
  }, [isPrivate, messages, user?.username]);

  const unseenMentionIds = useMemo(
    () => mentionMessageIds.filter((messageId) => !seenMentionIds.includes(messageId)),
    [mentionMessageIds, seenMentionIds],
  );

  const goToNextMention = useCallback(() => {
    const nextMessageId = unseenMentionIds[0];
    if (!nextMessageId) return;
    scrollToMessage(nextMessageId);
    markMentionSeen(
      room.id,
      nextMessageId,
      user?.id && eventSlug ? { eventSlug, userId: user.id } : undefined,
    );
  }, [eventSlug, markMentionSeen, room.id, scrollToMessage, unseenMentionIds, user?.id]);

  const registerMessageRef = useCallback((messageId: string, element: HTMLDivElement | null) => {
    if (element) {
      messageRefs.current.set(messageId, element);
      return;
    }
    messageRefs.current.delete(messageId);
  }, []);

  const sendViaApi = useCallback(
    async (payload: string, optimisticId: string): Promise<boolean> => {
      try {
        const data = await api<{ message: ChatMessage }>(messagePath, {
          method: "POST",
          body: JSON.stringify({ content: payload }),
        });
        upsertMessage(room.id, data.message);
        return true;
      } catch {
        removeMessage(room.id, optimisticId);
        return false;
      }
    },
    [api, messagePath, removeMessage, room.id, upsertMessage],
  );

  const sendContent = useCallback(
    async (content: ChatContent): Promise<boolean> => {
      if (!user || sendingRef.current) return false;
      if (isPrivate && !peerId) return false;
      if (isPrivate && content.type === "poll") return false;

      const payload = serializeChatContent(content);
      if (!payload) return false;

      const optimistic = createOptimisticChatMessage(payload, user, room);
      appendMessage(room.id, optimistic);
      if (content.type === "text") {
        setDraft(room.id, "");
        setReplyTo(room.id, null);
      }

      sendingRef.current = true;
      setSending(true);

      try {
        const activeSocket = socket ?? getSocket();

        if (activeSocket && isSocketConnected()) {
          return await new Promise<boolean>((resolve) => {
            const ackHandler = (error: Error | null, response?: SocketAck) => {
              if (error || response?.error || !response?.message) {
                void sendViaApi(payload, optimistic.id).then(resolve);
                return;
              }
              upsertMessage(room.id, response.message!);
              resolve(true);
            };

            if (isPrivate && peerId) {
              activeSocket
                .timeout(8000)
                .emit("dm:message", { recipientId: peerId, payload }, ackHandler);
            } else if (isStaff) {
              activeSocket.timeout(8000).emit("staff:message", payload, ackHandler);
            } else {
              const emitEvent = isGeneral ? "global:message" : "team:message";
              activeSocket.timeout(8000).emit(emitEvent, payload, ackHandler);
            }
          });
        }

        return await sendViaApi(payload, optimistic.id);
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [
      appendMessage,
      isGeneral,
      isPrivate,
      isStaff,
      peerId,
      room,
      sendViaApi,
      setDraft,
      setReplyTo,
      socket,
      upsertMessage,
      user,
    ],
  );

  const handleReply = useCallback(
    (message: ChatMessage) => {
      setReplyTo(room.id, buildReplyRef(message));
    },
    [room.id, setReplyTo],
  );

  const placeholder =
    isGeneral
      ? "Message everyone..."
      : isStaff
        ? "Message staff..."
        : isPrivate
          ? "Send a private message..."
          : `Message Team ${room.letter ?? ""}...`;

  const allowPrivateAction = !isPrivate && Boolean(onMessagePrivately);
  const groupGamesEnabled = teamGamesEnabled;
  const gamePicker =
    isPrivate && peerId && dmGamesEnabled
      ? { channel: "DM" as const, peerUserId: peerId, room }
      : isGeneral && groupGamesEnabled
        ? { channel: "GENERAL" as const, room }
        : isStaff && groupGamesEnabled
          ? { channel: "STAFF" as const, room }
          : room.category === "team" && groupGamesEnabled && user?.teamId === room.id
            ? { channel: "TEAM" as const, teamId: room.id, room }
            : undefined;
  const typers = useChatTyping(room.id, isActive, draft);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        !isActive && "hidden",
        className,
      )}
      aria-hidden={!isActive}
    >
      <div
        className={cn(
          "shrink-0 border-b border-border px-3 py-2.5 sm:px-6 sm:py-3",
          "max-lg:border-primary/20 max-lg:bg-primary max-lg:px-2 max-lg:py-2.5 max-lg:text-primary-foreground",
        )}
      >
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full p-2 transition",
                "text-muted-foreground hover:bg-muted hover:text-foreground",
                "max-lg:text-primary-foreground max-lg:hover:bg-primary-foreground/10 max-lg:hover:text-primary-foreground",
                "lg:hidden",
              )}
              aria-label="Back to chats"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white lg:hidden"
            style={{ backgroundColor: roomAvatarColor(room) }}
            aria-hidden
          >
            {roomAvatarLabel(room)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground max-lg:text-primary-foreground lg:text-base">
              {room.label}
            </h3>
            {room.category === "team" && room.name && (
              <p className="truncate text-sm text-muted-foreground max-lg:hidden">{room.name}</p>
            )}
            {isGeneral && (
              <p className="truncate text-sm text-muted-foreground max-lg:hidden">Event-wide conversation</p>
            )}
            {isStaff && (
              <p className="truncate text-sm text-muted-foreground max-lg:hidden">Staff-only group chat</p>
            )}
            {isPrivate && (
              <p className="truncate text-xs text-primary-foreground/75 lg:hidden">Direct message</p>
            )}
          </div>
          {!isPrivate && unseenMentionIds.length > 0 && (
            <button
              type="button"
              onClick={goToNextMention}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition",
                "bg-primary/10 text-primary hover:bg-primary/15",
                "max-lg:bg-primary-foreground/15 max-lg:text-primary-foreground max-lg:hover:bg-primary-foreground/25",
              )}
              aria-label={`Jump to next mention (${unseenMentionIds.length} remaining)`}
              title="Jump to next mention"
            >
              <span>@</span>
              <span>{unseenMentionIds.length}</span>
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className={cn(
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-chat-background px-3 py-2 sm:px-4 sm:py-3",
          "max-lg:px-2 max-lg:pb-[env(safe-area-inset-bottom,0px)]",
        )}
      >
        {!messagesLoaded && messages.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">No messages yet. Say hello!</p>
        ) : (
          messages.map((m, index) => {
            if (isSystemChatMessage(m)) {
              return <ChatSystemMessage key={m.id} message={m} />;
            }

            const isOwn = m.user.username === user?.username;
            const isGrouped = isSameMessageGroup(m, messages[index - 1]);
            const isGroupRoom = !isPrivate && !isStaff;
            const showName = !isOwn && isGroupRoom && !isGrouped;
            const showAvatar = !isOwn && !isGrouped;
            const isPending = m.id.startsWith("pending-");

            return (
              <ChatMessageBubble
                key={m.id}
                message={m}
                roomId={room.id}
                isOwn={isOwn}
                showName={showName}
                showAvatar={showAvatar}
                isGrouped={isGrouped}
                isPending={isPending}
                highlighted={highlightedMessageId === m.id}
                hidePolls={isPrivate}
                currentUsername={user?.username}
                registerRef={(element) => registerMessageRef(m.id, element)}
                onReply={handleReply}
                onMessagePrivately={allowPrivateAction && !isOwn ? onMessagePrivately : undefined}
                onScrollToReply={scrollToMessage}
              />
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className={cn(
          "shrink-0 border-t border-border px-3 py-2.5 sm:px-6 sm:py-4",
          "max-lg:border-border/60 max-lg:bg-card max-lg:px-2 max-lg:py-2",
          "max-lg:pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        )}
      >
        {typers.length > 0 && <TypingIndicator typers={typers} className="mb-2" />}
        <ChatComposer
          draft={draft}
          placeholder={placeholder}
          disabled={sending}
          allowPolls={!isPrivate}
          allowMentions={!isPrivate}
          mentionParticipants={participants}
          currentUserId={user?.id}
          gamePicker={gamePicker}
          replyTo={replyTo}
          onDraftChange={(value) => setDraft(room.id, value)}
          onClearReply={() => setReplyTo(room.id, null)}
          onScrollToReply={scrollToMessage}
          onSendContent={sendContent}
        />
      </div>
    </div>
  );
}
