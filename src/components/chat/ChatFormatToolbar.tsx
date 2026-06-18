"use client";

import type { ChatTextFormat } from "@/lib/chat-formatting";
import { cn } from "@/lib/cn";

const FORMAT_BUTTONS: Array<{ format: ChatTextFormat; label: string; title: string }> = [
  { format: "bold", label: "B", title: "Bold" },
  { format: "italic", label: "I", title: "Italic" },
  { format: "strike", label: "S", title: "Strikethrough" },
  { format: "code", label: "<>", title: "Monospace" },
  { format: "numbered", label: "1.", title: "Numbered list" },
  { format: "bullet", label: "•", title: "Bulleted list" },
  { format: "quote", label: "”", title: "Quote" },
];

interface ChatFormatToolbarProps {
  className?: string;
  onFormat: (format: ChatTextFormat) => void;
}

export function ChatFormatToolbar({ className, onFormat }: ChatFormatToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-1 shadow-lg",
        className,
      )}
      role="toolbar"
      aria-label="Text formatting"
    >
      {FORMAT_BUTTONS.map((button) => (
        <button
          key={button.format}
          type="button"
          title={button.title}
          aria-label={button.title}
          onMouseDown={(event) => {
            event.preventDefault();
            onFormat(button.format);
          }}
          className={cn(
            "flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-medium text-foreground transition hover:bg-muted",
            button.format === "bold" && "font-bold",
            button.format === "italic" && "italic",
            button.format === "strike" && "line-through",
            button.format === "code" && "font-mono text-xs",
          )}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}
