"use client";

import { useCallback, useRef, useState } from "react";
import { ChatMessageContent } from "@/components/chat/ChatMessageContent";
import { ChatPollMessage } from "@/components/chat/ChatPollMessage";
import { parseChatContent } from "@/lib/chat-content";
import {
  formatMessageTime,
  nameColorForUser,
  userInitials,
} from "@/lib/chat-display";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/types/chat";

const SWIPE_THRESHOLD = 56;
const SWIPE_MAX = 72;

interface ChatMessageBubbleProps {
  message: ChatMessage;
  roomId: string;
  isOwn: boolean;
  showName: boolean;
  showAvatar: boolean;
  isGrouped: boolean;
  isPending: boolean;
  highlighted?: boolean;
  hidePolls?: boolean;
  registerRef?: (element: HTMLDivElement | null) => void;
  onReply?: (message: ChatMessage) => void;
  onMessagePrivately?: (message: ChatMessage) => void;
  onScrollToReply?: (messageId: string) => void;
}

function MessageMeta({
  time,
  isOwn,
  isPending,
  onMedia = false,
  className,
}: {
  time: string;
  isOwn: boolean;
  isPending: boolean;
  onMedia?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] leading-none",
        onMedia ? "text-primary-foreground/90" : "text-muted-foreground",
        className,
      )}
    >
      <span>{time}</span>
      {isOwn && <MessageStatus isPending={isPending} onMedia={onMedia} />}
    </span>
  );
}

function MessageStatus({
  isPending,
  onMedia = false,
}: {
  isPending: boolean;
  onMedia?: boolean;
}) {
  if (isPending) {
    return (
      <svg
        viewBox="0 0 16 15"
        className={cn(
          "h-[14px] w-[14px]",
          onMedia ? "text-primary-foreground/80" : "text-muted-foreground/70",
        )}
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.51z"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 16 15"
      className={cn(
        "h-[14px] w-[14px]",
        onMedia ? "text-primary-foreground/90" : "text-primary",
      )}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.064-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.205a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"
      />
    </svg>
  );
}

function ReplyQuote({
  messageId,
  displayName,
  colorUsername,
  preview,
  isOwn,
  onScrollToReply,
}: {
  messageId: string;
  displayName: string;
  colorUsername: string;
  preview: string;
  isOwn: boolean;
  onScrollToReply?: (messageId: string) => void;
}) {
  const clickable = Boolean(onScrollToReply);

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable ? () => onScrollToReply!(messageId) : undefined}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
      className={cn(
        "mb-1.5 block w-full rounded-md border-l-[3px] px-2 py-1 text-left text-xs",
        isOwn
          ? "border-primary/60 bg-muted/40"
          : "border-secondary bg-muted/30",
        clickable && "cursor-pointer transition hover:brightness-95 active:brightness-90",
        !clickable && "cursor-default",
      )}
    >
      <p
        className="font-semibold leading-tight"
        style={{ color: nameColorForUser(colorUsername) }}
      >
        {displayName}
      </p>
      <p className="mt-0.5 line-clamp-2 text-muted-foreground">{preview}</p>
    </button>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h10a5 5 0 0 1 5 5v1M3 10l4-4M3 10l4 4"
      />
    </svg>
  );
}

export function ChatMessageBubble({
  message,
  roomId,
  isOwn,
  showName,
  showAvatar,
  isGrouped,
  isPending,
  highlighted = false,
  hidePolls = false,
  registerRef,
  onReply,
  onMessagePrivately,
  onScrollToReply,
}: ChatMessageBubbleProps) {
  const time = formatMessageTime(message.createdAt);
  const fullName = `${message.user.firstName} ${message.user.lastName}`;
  const content = parseChatContent(message.body);
  const isText = content.type === "text";
  const isPoll = content.type === "poll" && !hidePolls;
  const showActions = !isOwn && (onReply || onMessagePrivately);

  const [swipeX, setSwipeX] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const startXRef = useRef(0);
  const swipingRef = useRef(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerReply = useCallback(() => {
    onReply?.(message);
    setMenuOpen(false);
  }, [message, onReply]);

  const triggerPrivate = useCallback(() => {
    onMessagePrivately?.(message);
    setMenuOpen(false);
  }, [message, onMessagePrivately]);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (!onReply || isOwn) return;
    startXRef.current = event.touches[0].clientX;
    swipingRef.current = true;
    longPressRef.current = setTimeout(() => setMenuOpen(true), 500);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!swipingRef.current || !onReply || isOwn) return;
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    const delta = event.touches[0].clientX - startXRef.current;
    if (delta > 0) {
      setSwipeX(Math.min(delta, SWIPE_MAX));
    }
  };

  const handleTouchEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    if (swipeX >= SWIPE_THRESHOLD) {
      triggerReply();
    }
    setSwipeX(0);
    swipingRef.current = false;
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    if (!showActions) return;
    event.preventDefault();
    setMenuOpen(true);
  };

  return (
    <div
      ref={registerRef}
      className={cn(
        "group relative flex w-full gap-2",
        isOwn ? "justify-end" : "justify-start",
        isGrouped ? "mt-0.5" : "mt-2",
        highlighted && "chat-message-highlight",
      )}
      onContextMenu={handleContextMenu}
    >
      {!isOwn && (
        <div className="w-8 shrink-0 self-end">
          {showAvatar ? (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/15 text-[11px] font-semibold text-secondary"
              aria-hidden
            >
              {userInitials(message.user.firstName, message.user.lastName)}
            </span>
          ) : null}
        </div>
      )}

      <div className="relative max-w-[min(28rem,calc(100%-2.5rem))]">
        {!isOwn && swipeX > 8 && (
          <div
            className="pointer-events-none absolute inset-y-0 -left-8 flex items-center text-muted-foreground"
            aria-hidden
          >
            <ReplyIcon
              className={cn(
                "h-5 w-5 transition-opacity",
                swipeX >= SWIPE_THRESHOLD ? "text-primary opacity-100" : "opacity-60",
              )}
            />
          </div>
        )}

        <div
          className={cn(
            "relative w-fit shadow-sm transition-transform duration-75",
            isOwn
              ? "max-w-[min(28rem,85%)]"
              : "max-w-[min(28rem,calc(100%-2.5rem))]",
            isOwn ? "bg-surface text-foreground" : "bg-card text-foreground",
            isGrouped
              ? "rounded-lg"
              : isOwn
                ? "rounded-lg rounded-tr-none"
                : "rounded-lg rounded-tl-none",
            isPending && "opacity-80",
          )}
          style={!isOwn && swipeX > 0 ? { transform: `translateX(${swipeX}px)` } : undefined}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="px-2.5 pb-1.5 pt-1.5">
            {showName && (
              <p
                className="mb-0.5 text-[13px] font-semibold leading-tight"
                style={{ color: nameColorForUser(message.user.username) }}
              >
                {fullName}
              </p>
            )}

            {isText && content.replyTo && (
              <ReplyQuote
                messageId={content.replyTo.id}
                displayName={`${content.replyTo.firstName} ${content.replyTo.lastName}`}
                colorUsername={content.replyTo.username}
                preview={content.replyTo.preview}
                isOwn={isOwn}
                onScrollToReply={onScrollToReply}
              />
            )}

            {isText ? (
              <div className="text-[14.2px] leading-[19px] text-foreground">
                <MessageMeta
                  time={time}
                  isOwn={isOwn}
                  isPending={isPending}
                  className="float-right ml-2.5 mt-1 h-[15px] translate-y-px"
                />
                <span className="whitespace-pre-wrap break-words">{content.text}</span>
              </div>
            ) : isPoll ? (
              <div>
                <ChatPollMessage
                  messageId={message.id}
                  body={message.body}
                  roomId={roomId}
                />
                <div className="mt-1 flex justify-end">
                  <MessageMeta time={time} isOwn={isOwn} isPending={isPending} />
                </div>
              </div>
            ) : content.type === "poll" && hidePolls ? (
              <div className="text-[14.2px] leading-[19px] text-muted-foreground italic">
                <MessageMeta
                  time={time}
                  isOwn={isOwn}
                  isPending={isPending}
                  className="float-right ml-2.5 mt-1 h-[15px] translate-y-px"
                />
                Poll (not available in direct messages)
              </div>
            ) : (
              <div className="relative inline-block max-w-full">
                <ChatMessageContent
                  body={message.body}
                  className="text-[14.2px] leading-[19px] text-foreground"
                />
                <MessageMeta
                  time={time}
                  isOwn={isOwn}
                  isPending={isPending}
                  onMedia
                  className="absolute bottom-1 right-1 rounded px-1 py-0.5 bg-foreground/45"
                />
              </div>
            )}
          </div>
        </div>

        {showActions && menuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 cursor-default"
              aria-label="Close message actions"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-0 z-30 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
              {onReply && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                  onClick={triggerReply}
                >
                  <ReplyIcon className="h-4 w-4 shrink-0" />
                  Reply
                </button>
              )}
              {onMessagePrivately && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                  onClick={triggerPrivate}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    className="h-4 w-4 shrink-0"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  Message privately
                </button>
              )}
            </div>
          </>
        )}

        {showActions && !menuOpen && (
          <div className="absolute -right-1 top-1 hidden gap-0.5 group-hover:flex md:flex">
            {onReply && (
              <button
                type="button"
                onClick={triggerReply}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Reply"
              >
                <ReplyIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
