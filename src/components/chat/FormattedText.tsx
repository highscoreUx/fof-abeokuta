"use client";

import type { ReactNode } from "react";
import {
  parseFormattedLines,
  type FormattedTextSegment,
} from "@/lib/chat-formatting";
import type { ChatMention } from "@/lib/chat-mentions";
import { nameColorForUser } from "@/lib/chat-display";
import { cn } from "@/lib/cn";

function renderSegments(
  segments: FormattedTextSegment[],
  currentUsername?: string,
): ReactNode[] {
  return segments.map((segment, index) => {
    if (segment.kind === "text") {
      return <span key={index}>{segment.value}</span>;
    }

    if (segment.kind === "code") {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[13px]"
        >
          {segment.value}
        </code>
      );
    }

    if (segment.kind === "mention") {
      const isSelf =
        currentUsername &&
        segment.username.toLowerCase() === currentUsername.toLowerCase();
      return (
        <span
          key={index}
          className={cn(
            "font-semibold",
            isSelf ? "text-primary" : "text-secondary",
          )}
          style={!isSelf ? { color: nameColorForUser(segment.username) } : undefined}
        >
          @{segment.username}
        </span>
      );
    }

    if (segment.kind === "bold") {
      return (
        <strong key={index} className="font-semibold">
          {renderSegments(segment.children, currentUsername)}
        </strong>
      );
    }

    if (segment.kind === "italic") {
      return (
        <em key={index} className="italic">
          {renderSegments(segment.children, currentUsername)}
        </em>
      );
    }

    return (
      <span key={index} className="line-through">
        {renderSegments(segment.children, currentUsername)}
      </span>
    );
  });
}

interface FormattedTextProps {
  text: string;
  mentions?: ChatMention[];
  currentUsername?: string;
  className?: string;
}

export function FormattedText({
  text,
  mentions,
  currentUsername,
  className,
}: FormattedTextProps) {
  const lines = parseFormattedLines(text, mentions);

  return (
    <span className={className}>
      {lines.map((line, lineIndex) => (
        <span key={lineIndex}>
          {line.quote ? (
            <span className="my-0.5 block border-l-2 border-muted-foreground/40 pl-2 italic">
              {renderSegments(line.segments, currentUsername)}
            </span>
          ) : (
            renderSegments(line.segments, currentUsername)
          )}
          {lineIndex < lines.length - 1 ? "\n" : null}
        </span>
      ))}
    </span>
  );
}
