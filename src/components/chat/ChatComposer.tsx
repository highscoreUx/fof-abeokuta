"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatContent } from "@/lib/chat-content";
import type { ChatReplyRef } from "@/lib/chat-reply";
import {
  CHAT_EMOJI_CATEGORIES,
  CHAT_GIFS,
  CHAT_STICKER_PACKS,
} from "@/lib/chat-assets";
import {
  createPoll,
  isValidPollData,
  POLL_MAX_EXPIRY_MINUTES,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
} from "@/lib/chat-poll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type PickerTab = "emoji" | "gif" | "sticker";

interface ChatComposerProps {
  draft: string;
  placeholder: string;
  disabled?: boolean;
  replyTo?: ChatReplyRef | null;
  onDraftChange: (value: string) => void;
  onClearReply?: () => void;
  onSendContent: (content: ChatContent) => boolean | Promise<boolean>;
}

export function ChatComposer({
  draft,
  placeholder,
  disabled = false,
  replyTo = null,
  onDraftChange,
  onClearReply,
  onSendContent,
}: ChatComposerProps) {
  const [picker, setPicker] = useState<PickerTab | null>(null);
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [allowVoteSwitching, setAllowVoteSwitching] = useState(false);
  const [timedPoll, setTimedPoll] = useState(false);
  const [expiresInMinutes, setExpiresInMinutes] = useState("5");
  const [emojiCategory, setEmojiCategory] = useState<string>(CHAT_EMOJI_CATEGORIES[0].id);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!picker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setPicker(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [picker]);

  const sendText = async () => {
    const text = draft.trim();
    if (!text || disabled) return;
    const sent = await onSendContent({
      type: "text",
      text,
      ...(replyTo ? { replyTo } : {}),
    });
    if (!sent) return;
    onDraftChange("");
    onClearReply?.();
    setPicker(null);
  };

  const insertEmoji = (emoji: string) => {
    onDraftChange(draft + emoji);
  };

  const sendGif = async (gif: (typeof CHAT_GIFS)[number]) => {
    if (disabled) return;
    if (!(await onSendContent({ type: "gif", url: gif.url, alt: gif.alt }))) return;
    setPicker(null);
  };

  const sendSticker = async (sticker: (typeof CHAT_STICKER_PACKS)[number]["stickers"][number]) => {
    if (disabled) return;
    if (
      !(await onSendContent({
        type: "sticker",
        id: sticker.id,
        url: sticker.url,
        label: sticker.label,
      }))
    ) {
      return;
    }
    setPicker(null);
  };

  const openPollBuilder = () => {
    setPicker(null);
    setShowPollBuilder((open) => !open);
  };

  const updatePollOption = (index: number, value: string) => {
    setPollOptions((current) => current.map((option, i) => (i === index ? value : option)));
  };

  const addPollOption = () => {
    setPollOptions((current) =>
      current.length < POLL_MAX_OPTIONS ? [...current, ""] : current,
    );
  };

  const removePollOption = (index: number) => {
    setPollOptions((current) =>
      current.length > POLL_MIN_OPTIONS ? current.filter((_, i) => i !== index) : current,
    );
  };

  const buildDraftPoll = () => {
    const minutes = timedPoll ? parseInt(expiresInMinutes, 10) : undefined;
    return createPoll(pollQuestion, pollOptions, {
      allowVoteSwitching,
      expiresInMinutes:
        minutes && minutes > 0 ? Math.min(minutes, POLL_MAX_EXPIRY_MINUTES) : undefined,
    });
  };

  const sendPoll = async () => {
    if (disabled) return;

    const poll = buildDraftPoll();
    if (!isValidPollData(poll)) return;
    if (!(await onSendContent({ type: "poll", poll }))) return;

    setPollQuestion("");
    setPollOptions(["", ""]);
    setAllowVoteSwitching(false);
    setTimedPoll(false);
    setExpiresInMinutes("5");
    setShowPollBuilder(false);
  };

  const pollReady = isValidPollData(buildDraftPoll());

  const activeEmojiCategory =
    CHAT_EMOJI_CATEGORIES.find((category) => category.id === emojiCategory) ??
    CHAT_EMOJI_CATEGORIES[0];

  const pickerTabs: Array<{ id: PickerTab; label: string }> = [
    { id: "emoji", label: "Emoji" },
    { id: "gif", label: "GIF" },
    { id: "sticker", label: "Stickers" },
  ];

  return (
    <div ref={containerRef} className="relative space-y-2">
      {replyTo && (
        <div className="flex items-start gap-2 rounded-lg border-l-[3px] border-primary bg-muted/40 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">
              Replying to {replyTo.firstName} {replyTo.lastName}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{replyTo.preview}</p>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Cancel reply"
          >
            ✕
          </button>
        </div>
      )}

      {showPollBuilder && (
        <div className="mb-2 space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Create poll</p>
            <button
              type="button"
              onClick={() => setShowPollBuilder(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>

          <Input
            value={pollQuestion}
            disabled={disabled}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Ask a question..."
            maxLength={200}
          />

          <div className="space-y-2">
            {pollOptions.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={option}
                  disabled={disabled}
                  onChange={(e) => updatePollOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  maxLength={100}
                />
                {pollOptions.length > POLL_MIN_OPTIONS && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 px-2"
                    onClick={() => removePollOption(index)}
                    aria-label={`Remove option ${index + 1}`}
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={allowVoteSwitching}
                disabled={disabled}
                onChange={(e) => setAllowVoteSwitching(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary"
              />
              Allow vote switching
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={timedPoll}
                disabled={disabled}
                onChange={(e) => setTimedPoll(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary"
              />
              Timed poll
            </label>
            {timedPoll && (
              <div className="flex items-center gap-2 pl-6">
                <Input
                  type="number"
                  min={1}
                  max={POLL_MAX_EXPIRY_MINUTES}
                  value={expiresInMinutes}
                  disabled={disabled}
                  onChange={(e) => setExpiresInMinutes(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">minutes until close</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {pollOptions.length < POLL_MAX_OPTIONS ? (
              <Button type="button" variant="ghost" size="sm" onClick={addPollOption}>
                Add option
              </Button>
            ) : (
              <span />
            )}
            <Button
              type="button"
              size="sm"
              disabled={disabled || !pollReady}
              onClick={() => void sendPoll()}
            >
              Send poll
            </Button>
          </div>
        </div>
      )}

      {picker && (
        <div className="absolute bottom-full left-0 right-0 z-10 mb-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="flex border-b border-border">
            {pickerTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPicker(tab.id)}
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-medium transition",
                  picker === tab.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-h-56 overflow-y-auto p-3">
            {picker === "emoji" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {CHAT_EMOJI_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setEmojiCategory(category.id)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        emojiCategory === category.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {activeEmojiCategory.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="rounded-lg p-2 text-xl hover:bg-muted"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {picker === "gif" && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {CHAT_GIFS.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onClick={() => sendGif(gif)}
                    className="overflow-hidden rounded-lg border border-border hover:border-primary/40"
                    title={gif.alt}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gif.url} alt={gif.alt} className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {picker === "sticker" && (
              <div className="space-y-3">
                {CHAT_STICKER_PACKS.map((pack) => (
                  <div key={pack.id}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {pack.label}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {pack.stickers.map((sticker) => (
                        <button
                          key={sticker.id}
                          type="button"
                          onClick={() => sendSticker(sticker)}
                          className="rounded-lg border border-border p-2 hover:border-primary/40 hover:bg-muted/40"
                          title={sticker.label}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sticker.url}
                            alt={sticker.label}
                            className="mx-auto h-14 w-14 object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-0.5 overflow-x-auto sm:gap-1">
        <Button
          type="button"
          variant={picker === "emoji" ? "secondary" : "ghost"}
          size="sm"
          className="shrink-0 px-2 sm:px-2.5"
          onClick={() => {
            setShowPollBuilder(false);
            setPicker((current) => (current === "emoji" ? null : "emoji"));
          }}
          aria-label="Emoji"
        >
          😊
        </Button>
        <Button
          type="button"
          variant={picker === "gif" ? "secondary" : "ghost"}
          size="sm"
          className="shrink-0 px-2 text-xs font-semibold sm:px-2.5"
          onClick={() => {
            setShowPollBuilder(false);
            setPicker((current) => (current === "gif" ? null : "gif"));
          }}
          aria-label="GIF"
        >
          GIF
        </Button>
        <Button
          type="button"
          variant={picker === "sticker" ? "secondary" : "ghost"}
          size="sm"
          className="shrink-0 px-2 text-xs font-semibold sm:px-2.5"
          onClick={() => {
            setShowPollBuilder(false);
            setPicker((current) => (current === "sticker" ? null : "sticker"));
          }}
          aria-label="Stickers"
        >
          🎨
        </Button>
        <Button
          type="button"
          variant={showPollBuilder ? "secondary" : "ghost"}
          size="sm"
          className="shrink-0 px-2 text-xs font-semibold sm:px-2.5"
          onClick={openPollBuilder}
          aria-label="Poll"
        >
          Poll
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          disabled={disabled}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void sendText()}
          placeholder={placeholder}
          className="min-w-0 flex-1"
        />
        <Button
          onClick={() => void sendText()}
          disabled={disabled}
          size="sm"
          className="shrink-0 sm:h-10 sm:px-4 sm:text-sm"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
