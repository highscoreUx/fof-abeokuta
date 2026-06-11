"use client";

import { parseChatContent } from "@/lib/chat-content";
import { cn } from "@/lib/cn";

interface ChatMessageContentProps {
  body: string;
  className?: string;
}

export function ChatMessageContent({ body, className }: ChatMessageContentProps) {
  const content = parseChatContent(body);

  if (content.type === "gif") {
    return (
      <div className={cn(className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={content.url}
          alt={content.alt ?? "GIF"}
          className="max-h-52 max-w-full rounded-md object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  if (content.type === "sticker") {
    return (
      <div className={cn(className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={content.url}
          alt={content.label ?? "Sticker"}
          className="h-28 w-28 object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <p className={cn("whitespace-pre-wrap break-words", className ?? "text-foreground")}>
      {content.text}
    </p>
  );
}
