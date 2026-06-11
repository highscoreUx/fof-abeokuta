"use client";

import { systemMessageText } from "@/lib/chat-system";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/types/chat";

interface ChatSystemMessageProps {
  message: ChatMessage;
  className?: string;
}

export function ChatSystemMessage({ message, className }: ChatSystemMessageProps) {
  const text = systemMessageText(message);

  return (
    <div className={cn("my-3 flex justify-center px-2", className)}>
      <div className="max-w-[92%] rounded-full border border-border/80 bg-muted/60 px-4 py-1.5 text-center text-xs text-muted-foreground shadow-sm">
        {text}
      </div>
    </div>
  );
}
