"use client";

import { Clock, WarningCircle } from "@phosphor-icons/react";
import type { ChatDeliveryStatus } from "@/lib/chat-delivery";
import { cn } from "@/lib/cn";

interface ChatMessageDeliveryStatusProps {
  status: ChatDeliveryStatus;
  onMedia?: boolean;
  onResend?: () => void;
}

export function ChatMessageDeliveryStatus({
  status,
  onMedia = false,
  onResend,
}: ChatMessageDeliveryStatusProps) {
  if (status === "pending") {
    return (
      <Clock
        size={14}
        weight="bold"
        className={cn(
          "shrink-0 animate-spin",
          onMedia ? "text-primary-foreground/80" : "text-muted-foreground/70",
        )}
        style={{ animationDuration: "2.5s" }}
        aria-label="Sending"
      />
    );
  }

  if (status === "failed") {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onResend?.();
        }}
        className="inline-flex shrink-0 items-center justify-center"
        aria-label="Message failed to send. Tap to retry."
      >
        <WarningCircle size={14} weight="fill" className="text-red-500" />
      </button>
    );
  }

  return (
    <svg
      viewBox="0 0 16 15"
      className={cn(
        "h-[14px] w-[14px] shrink-0",
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
