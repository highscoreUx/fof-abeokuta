"use client";

import { ChatMessageContent } from "@/components/chat/ChatMessageContent";
import { parseChatContent } from "@/lib/chat-content";
import {
  formatMessageTime,
  nameColorForUser,
  userInitials,
} from "@/lib/chat-display";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/types/chat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showName: boolean;
  showAvatar: boolean;
  isGrouped: boolean;
  isPending: boolean;
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
        onMedia ? "text-white/90" : "text-black/45",
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
          onMedia ? "text-white/80" : "text-black/35",
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
        onMedia ? "text-white/90" : "text-[#53bdeb]",
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

export function ChatMessageBubble({
  message,
  isOwn,
  showName,
  showAvatar,
  isGrouped,
  isPending,
}: ChatMessageBubbleProps) {
  const time = formatMessageTime(message.createdAt);
  const fullName = `${message.user.firstName} ${message.user.lastName}`;
  const content = parseChatContent(message.body);
  const isText = content.type === "text";

  return (
    <div
      className={cn(
        "flex w-full gap-2",
        isOwn ? "justify-end" : "justify-start",
        isGrouped ? "mt-0.5" : "mt-2",
      )}
    >
      {!isOwn && (
        <div className="w-8 shrink-0 self-end">
          {showAvatar ? (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
              aria-hidden
            >
              {userInitials(message.user.firstName, message.user.lastName)}
            </span>
          ) : null}
        </div>
      )}

      <div
        className={cn(
          "relative w-fit max-w-[min(28rem,82%)] shadow-sm",
          isOwn ? "bg-[#d9fdd3] text-[#111b21]" : "bg-white text-[#111b21]",
          isGrouped
            ? "rounded-lg"
            : isOwn
              ? "rounded-lg rounded-tr-none"
              : "rounded-lg rounded-tl-none",
          isPending && "opacity-80",
        )}
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

          {isText ? (
            <div className="text-[14.2px] leading-[19px] text-[#111b21]">
              <MessageMeta
                time={time}
                isOwn={isOwn}
                isPending={isPending}
                className="float-right ml-2.5 mt-1 h-[15px] translate-y-px"
              />
              <span className="whitespace-pre-wrap break-words">{content.text}</span>
            </div>
          ) : (
            <div className="relative inline-block max-w-full">
              <ChatMessageContent
                body={message.body}
                className="text-[14.2px] leading-[19px] text-[#111b21]"
              />
              <MessageMeta
                time={time}
                isOwn={isOwn}
                isPending={isPending}
                onMedia
                className="absolute bottom-1 right-1 rounded px-1 py-0.5 bg-black/35"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
