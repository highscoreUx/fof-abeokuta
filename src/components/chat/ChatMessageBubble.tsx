"use client";

import { useCallback, useRef, useState } from "react";
import { ChatMessageContent } from "@/components/chat/ChatMessageContent";
import { ChatActivityCard } from "@/components/chat/ChatActivityCard";
import { ChatGameCard } from "@/components/chat/ChatGameCard";
import { ChatMessageDeliveryStatus } from "@/components/chat/ChatMessageDeliveryStatus";
import { ChatPollMessage } from "@/components/chat/ChatPollMessage";
import type { ChatMention } from "@/lib/chat-mentions";
import type { ChatDeliveryStatus } from "@/lib/chat-delivery";
import { parseChatContent } from "@/lib/chat-content";
import { FormattedText } from "@/components/chat/FormattedText";
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
  deliveryStatus?: ChatDeliveryStatus;
  onResend?: () => void;
  highlighted?: boolean;
  hidePolls?: boolean;
  currentUsername?: string;
  registerRef?: (element: HTMLDivElement | null) => void;
  onReply?: (message: ChatMessage) => void;
  onMessagePrivately?: (message: ChatMessage) => void;
  onScrollToReply?: (messageId: string) => void;
}

function MessageMeta({
  time,
  isOwn,
  deliveryStatus,
  onMedia = false,
  onResend,
  className,
}: {
  time: string;
  isOwn: boolean;
  deliveryStatus?: ChatDeliveryStatus;
  onMedia?: boolean;
  onResend?: () => void;
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
      {isOwn && deliveryStatus && (
        <ChatMessageDeliveryStatus
          status={deliveryStatus}
          onMedia={onMedia}
          onResend={onResend}
        />
      )}
    </span>
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
        "mb-1.5 block max-w-full rounded-md border-l-[3px] px-2 py-1 text-left text-xs",
        isOwn
          ? "border-primary/60 bg-muted/40"
          : "border-secondary bg-muted/30",
        clickable && "cursor-pointer transition hover:brightness-95 active:brightness-90",
        !clickable && "cursor-default",
      )}
    >
      <p
        className="truncate font-semibold leading-tight"
        style={{ color: nameColorForUser(colorUsername) }}
      >
        {displayName}
      </p>
      <p className="mt-0.5 truncate text-muted-foreground">{preview}</p>
    </button>
  );
}

function TextMessageBody({
  text,
  mentions,
  currentUsername,
  time,
  isOwn,
  deliveryStatus,
  onResend,
}: {
  text: string;
  mentions?: ChatMention[];
  currentUsername?: string;
  time: string;
  isOwn: boolean;
  deliveryStatus?: ChatDeliveryStatus;
  onResend?: () => void;
}) {
  const body = (
    <FormattedText
      text={text}
      mentions={mentions}
      currentUsername={currentUsername}
      className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
    />
  );
  const isShort = !text.includes("\n") && text.length <= 20;

  if (isShort) {
    return (
      <div className="flex items-end gap-2 text-[14.2px] leading-[19px] text-foreground">
        {body}
        <MessageMeta
          time={time}
          isOwn={isOwn}
          deliveryStatus={deliveryStatus}
          onResend={onResend}
          className="shrink-0 pb-px"
        />
      </div>
    );
  }

  return (
    <div className="text-[14.2px] leading-[19px] text-foreground">
      <MessageMeta
        time={time}
        isOwn={isOwn}
        deliveryStatus={deliveryStatus}
        onResend={onResend}
        className="float-right ml-2.5 mt-0.5 h-[15px] shrink-0 translate-y-px"
      />
      {body}
    </div>
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
  deliveryStatus,
  onResend,
  highlighted = false,
  hidePolls = false,
  currentUsername,
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
  const isActivity = content.type === "activity";
  const isChatGame = content.type === "chat_game";
  const hasReply = isText && Boolean(content.replyTo);
  const canReply = Boolean(onReply);
  const canMessagePrivately = Boolean(onMessagePrivately);
  const canOpenMenu = canReply || canMessagePrivately;

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
    if (!canReply) return;
    startXRef.current = event.touches[0].clientX;
    swipingRef.current = true;
    longPressRef.current = setTimeout(() => setMenuOpen(true), 500);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!swipingRef.current || !canReply) return;
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    const delta = event.touches[0].clientX - startXRef.current;
    if (isOwn) {
      if (delta < 0) setSwipeX(Math.max(delta, -SWIPE_MAX));
    } else if (delta > 0) {
      setSwipeX(Math.min(delta, SWIPE_MAX));
    }
  };

  const handleTouchEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    const swipeDistance = isOwn ? -swipeX : swipeX;
    if (swipeDistance >= SWIPE_THRESHOLD) {
      triggerReply();
    }
    setSwipeX(0);
    swipingRef.current = false;
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    if (!canOpenMenu) return;
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

      <div
        className={cn(
          "relative min-w-0",
          isOwn ? "max-w-[min(28rem,85%)]" : "max-w-[min(28rem,calc(100%-2.5rem))]",
        )}
      >
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
        {isOwn && swipeX < -8 && (
          <div
            className="pointer-events-none absolute inset-y-0 -right-8 flex items-center text-muted-foreground"
            aria-hidden
          >
            <ReplyIcon
              className={cn(
                "h-5 w-5 transition-opacity",
                -swipeX >= SWIPE_THRESHOLD ? "text-primary opacity-100" : "opacity-60",
              )}
            />
          </div>
        )}

        <div
          className={cn(
            "relative max-w-full shadow-sm transition-transform duration-75",
            hasReply ? "inline-block w-max" : "inline-block",
            (isPoll || isActivity || isChatGame) && "w-full min-w-[14rem]",
            isOwn ? "bg-surface text-foreground" : "bg-card text-foreground",
            isGrouped
              ? "rounded-lg"
              : isOwn
                ? "rounded-lg rounded-tr-none"
                : "rounded-lg rounded-tl-none",
            deliveryStatus === "failed" && isOwn && "ring-1 ring-red-500/40",
          )}
          style={swipeX !== 0 ? { transform: `translateX(${swipeX}px)` } : undefined}
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
              <TextMessageBody
                text={content.text}
                mentions={content.mentions}
                currentUsername={currentUsername}
                time={time}
                isOwn={isOwn}
                deliveryStatus={deliveryStatus}
                onResend={onResend}
              />
            ) : isChatGame ? (
              <div>
                <ChatGameCard chatGame={content.chatGame} />
                <div className="mt-1 flex justify-end">
                  <MessageMeta
                    time={time}
                    isOwn={isOwn}
                    deliveryStatus={deliveryStatus}
                    onResend={onResend}
                  />
                </div>
              </div>
            ) : isActivity ? (
              <div>
                <ChatActivityCard activity={content.activity} />
                <div className="mt-1 flex justify-end">
                  <MessageMeta
                    time={time}
                    isOwn={isOwn}
                    deliveryStatus={deliveryStatus}
                    onResend={onResend}
                  />
                </div>
              </div>
            ) : isPoll ? (
              <div>
                <ChatPollMessage
                  messageId={message.id}
                  body={message.body}
                  roomId={roomId}
                />
                <div className="mt-1 flex justify-end">
                  <MessageMeta
                    time={time}
                    isOwn={isOwn}
                    deliveryStatus={deliveryStatus}
                    onResend={onResend}
                  />
                </div>
              </div>
            ) : content.type === "poll" && hidePolls ? (
              <TextMessageBody
                text="Poll (not available in direct messages)"
                time={time}
                isOwn={isOwn}
                deliveryStatus={deliveryStatus}
                onResend={onResend}
              />
            ) : (
              <div className="relative inline-block max-w-full">
                <ChatMessageContent
                  body={message.body}
                  className="text-[14.2px] leading-[19px] text-foreground"
                />
                <MessageMeta
                  time={time}
                  isOwn={isOwn}
                  deliveryStatus={deliveryStatus}
                  onResend={onResend}
                  onMedia
                  className="absolute bottom-1 right-1 rounded px-1 py-0.5 bg-foreground/45"
                />
              </div>
            )}
          </div>
        </div>

        {canOpenMenu && menuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 cursor-default"
              aria-label="Close message actions"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-0 z-30 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
              {canReply && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                  onClick={triggerReply}
                >
                  <ReplyIcon className="h-4 w-4 shrink-0" />
                  Reply
                </button>
              )}
              {canMessagePrivately && (
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

        {canReply && !menuOpen && (
          <button
            type="button"
            onClick={triggerReply}
            className={cn(
              "absolute top-1/2 hidden -translate-y-1/2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 md:inline-flex",
              isOwn ? "right-full mr-1.5" : "left-full ml-1.5",
            )}
            aria-label="Reply"
          >
            <ReplyIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
