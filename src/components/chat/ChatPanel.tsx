"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
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
import { cn } from "@/lib/cn";
import type { ChatContent } from "@/lib/chat-content";
import { serializeChatContent } from "@/lib/chat-content";
import { createOptimisticChatMessage } from "@/lib/chat-optimistic";
import { buildReplyRef } from "@/lib/chat-reply";
import { EMPTY_CHAT_MESSAGES, useChatStore } from "@/stores/chatStore";
import type { ChatMessage, ChatRoom } from "@/types/chat";

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
  const { user } = useAuth();
  const socket = useSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const messages = useChatStore((s) => s.messagesByRoom[room.id] ?? EMPTY_CHAT_MESSAGES);
  const draft = useChatStore((s) => s.draftsByRoom[room.id] ?? "");
  const replyTo = useChatStore((s) => s.replyToByRoom[room.id] ?? null);
  const messagesLoaded = useChatStore((s) => s.messagesLoaded[room.id] ?? false);
  const setMessages = useChatStore((s) => s.setMessages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const upsertMessage = useChatStore((s) => s.upsertMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const setDraft = useChatStore((s) => s.setDraft);
  const setReplyTo = useChatStore((s) => s.setReplyTo);
  const markMessagesLoaded = useChatStore((s) => s.markMessagesLoaded);

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
    if (!isActive) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isActive]);

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

  const allowPrivateAction = !isPrivate && !isStaff && Boolean(onMessagePrivately);
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
      <div className="shrink-0 border-b border-border px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
              aria-label="Back to chats"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground">{room.label}</h3>
            {room.category === "team" && room.name && (
              <p className="truncate text-sm text-muted-foreground">{room.name}</p>
            )}
            {isGeneral && (
              <p className="truncate text-sm text-muted-foreground">Event-wide conversation</p>
            )}
            {isStaff && (
              <p className="truncate text-sm text-muted-foreground">Staff-only group chat</p>
            )}
            {isPrivate && (
              <p className="truncate text-sm text-muted-foreground">Direct message</p>
            )}
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-chat-background px-3 py-2 sm:px-4 sm:py-3"
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

      <div className="shrink-0 border-t border-border px-3 py-2.5 sm:px-6 sm:py-4">
        {typers.length > 0 && <TypingIndicator typers={typers} className="mb-2" />}
        <ChatComposer
          draft={draft}
          placeholder={placeholder}
          disabled={sending}
          allowPolls={!isPrivate}
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
