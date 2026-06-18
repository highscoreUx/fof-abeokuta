export type ChatTextFormat =
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "bullet"
  | "numbered"
  | "quote";

const INLINE_WRAPPERS: Record<"bold" | "italic" | "strike" | "code", [string, string]> = {
  bold: ["*", "*"],
  italic: ["_", "_"],
  strike: ["~", "~"],
  code: ["```", "```"],
};

export function applyTextFormat(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  format: ChatTextFormat,
): { text: string; selectionStart: number; selectionEnd: number } {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  const selected = text.slice(start, end);

  if (format === "bullet" || format === "numbered" || format === "quote") {
    const blockStart = text.lastIndexOf("\n", start - 1) + 1;
    const nextNewline = text.indexOf("\n", end);
    const blockEnd = nextNewline === -1 ? text.length : nextNewline;
    const block = text.slice(blockStart, blockEnd);
    const lines = block.split("\n");
    const formatted = lines
      .map((line, index) => {
        if (!line && lines.length > 1) return line;
        if (format === "quote") return line.startsWith("> ") ? line : `> ${line}`;
        if (format === "bullet") {
          return /^[-*] /.test(line) ? line : `- ${line}`;
        }
        const numberedMatch = line.match(/^(\d+)\.\s/);
        if (numberedMatch) return line;
        return `${index + 1}. ${line}`;
      })
      .join("\n");

    const nextText = `${text.slice(0, blockStart)}${formatted}${text.slice(blockEnd)}`;
    const delta = formatted.length - block.length;
    return {
      text: nextText,
      selectionStart: start,
      selectionEnd: end + delta,
    };
  }

  const [open, close] = INLINE_WRAPPERS[format];
  const nextText = `${text.slice(0, start)}${open}${selected}${close}${text.slice(end)}`;
  const cursorStart = start + open.length;
  const cursorEnd = cursorStart + selected.length;

  return {
    text: nextText,
    selectionStart: selected.length > 0 ? cursorStart : cursorStart,
    selectionEnd: selected.length > 0 ? cursorEnd : cursorStart,
  };
}

export type FormattedTextSegment =
  | { kind: "text"; value: string }
  | { kind: "bold"; children: FormattedTextSegment[] }
  | { kind: "italic"; children: FormattedTextSegment[] }
  | { kind: "strike"; children: FormattedTextSegment[] }
  | { kind: "code"; value: string }
  | { kind: "mention"; username: string; userId?: string };

type InlineFormatKind = "code" | "bold" | "italic" | "strike" | "mention";

function parseInlineSegments(
  text: string,
  mentionUserIds: Map<string, string | undefined>,
): FormattedTextSegment[] {
  const segments: FormattedTextSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let nextIndex = text.length;
    let nextKind: InlineFormatKind | null = null;
    let nextMatch: RegExpExecArray | null = null;

    const patterns: Array<{ kind: InlineFormatKind; regex: RegExp }> = [
      { kind: "code", regex: /```([\s\S]+?)```/y },
      { kind: "bold", regex: /\*([^*\n]+)\*/y },
      { kind: "italic", regex: /_([^_\n]+)_/y },
      { kind: "strike", regex: /~([^~\n]+)~/y },
      { kind: "mention", regex: /@([a-zA-Z0-9_]+)/y },
    ];

    for (const pattern of patterns) {
      pattern.regex.lastIndex = cursor;
      const match = pattern.regex.exec(text);
      if (!match || match.index >= nextIndex) continue;
      nextIndex = match.index;
      nextKind = pattern.kind;
      nextMatch = match;
    }

    if (!nextKind || !nextMatch) {
      segments.push({ kind: "text", value: text.slice(cursor) });
      break;
    }

    if (nextIndex > cursor) {
      segments.push({ kind: "text", value: text.slice(cursor, nextIndex) });
    }

    if (nextKind === "code") {
      segments.push({ kind: "code", value: nextMatch[1] });
    } else if (nextKind === "mention") {
      const username = nextMatch[1];
      segments.push({
        kind: "mention",
        username,
        userId: mentionUserIds.get(username.toLowerCase()),
      });
    } else {
      const children = parseInlineSegments(nextMatch[1], mentionUserIds);
      if (nextKind === "bold") segments.push({ kind: "bold", children });
      if (nextKind === "italic") segments.push({ kind: "italic", children });
      if (nextKind === "strike") segments.push({ kind: "strike", children });
    }

    cursor = nextIndex + nextMatch[0].length;
  }

  return segments;
}

export function parseFormattedInline(
  text: string,
  mentions?: Array<{ username: string; userId: string }>,
): FormattedTextSegment[] {
  const mentionUserIds = new Map(
    (mentions ?? []).map((mention) => [mention.username.toLowerCase(), mention.userId]),
  );
  return parseInlineSegments(text, mentionUserIds);
}

export interface FormattedTextLine {
  quote: boolean;
  segments: FormattedTextSegment[];
}

export function parseFormattedLines(
  text: string,
  mentions?: Array<{ username: string; userId: string }>,
): FormattedTextLine[] {
  const mentionUserIds = new Map(
    (mentions ?? []).map((mention) => [mention.username.toLowerCase(), mention.userId]),
  );

  return text.split("\n").map((line) => {
    const quoteMatch = line.match(/^> (.+)$/);
    if (quoteMatch) {
      return {
        quote: true,
        segments: parseInlineSegments(quoteMatch[1], mentionUserIds),
      };
    }

    const bulletMatch = line.match(/^[-*] (.+)$/);
    if (bulletMatch) {
      return {
        quote: false,
        segments: [
          { kind: "text", value: "• " },
          ...parseInlineSegments(bulletMatch[1], mentionUserIds),
        ],
      };
    }

    const numberedMatch = line.match(/^(\d+)\. (.+)$/);
    if (numberedMatch) {
      return {
        quote: false,
        segments: [
          { kind: "text", value: `${numberedMatch[1]}. ` },
          ...parseInlineSegments(numberedMatch[2], mentionUserIds),
        ],
      };
    }

    return {
      quote: false,
      segments: parseInlineSegments(line, mentionUserIds),
    };
  });
}
