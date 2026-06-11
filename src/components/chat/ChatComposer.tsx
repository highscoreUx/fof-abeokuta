"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatContent } from "@/lib/chat-content";
import {
  CHAT_EMOJI_CATEGORIES,
  CHAT_GIFS,
  CHAT_STICKER_PACKS,
} from "@/lib/chat-assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type PickerTab = "emoji" | "gif" | "sticker";

interface ChatComposerProps {
  draft: string;
  placeholder: string;
  onDraftChange: (value: string) => void;
  onSendContent: (content: ChatContent) => void;
}

export function ChatComposer({
  draft,
  placeholder,
  onDraftChange,
  onSendContent,
}: ChatComposerProps) {
  const [picker, setPicker] = useState<PickerTab | null>(null);
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

  const sendText = () => {
    const text = draft.trim();
    if (!text) return;
    onSendContent({ type: "text", text });
    onDraftChange("");
    setPicker(null);
  };

  const insertEmoji = (emoji: string) => {
    onDraftChange(draft + emoji);
  };

  const sendGif = (gif: (typeof CHAT_GIFS)[number]) => {
    onSendContent({ type: "gif", url: gif.url, alt: gif.alt });
    setPicker(null);
  };

  const sendSticker = (sticker: (typeof CHAT_STICKER_PACKS)[number]["stickers"][number]) => {
    onSendContent({
      type: "sticker",
      id: sticker.id,
      url: sticker.url,
      label: sticker.label,
    });
    setPicker(null);
  };

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

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant={picker === "emoji" ? "secondary" : "ghost"}
          size="sm"
          className="shrink-0 px-2.5"
          onClick={() => setPicker((current) => (current === "emoji" ? null : "emoji"))}
          aria-label="Emoji"
        >
          😊
        </Button>
        <Button
          type="button"
          variant={picker === "gif" ? "secondary" : "ghost"}
          size="sm"
          className="shrink-0 px-2.5 text-xs font-semibold"
          onClick={() => setPicker((current) => (current === "gif" ? null : "gif"))}
          aria-label="GIF"
        >
          GIF
        </Button>
        <Button
          type="button"
          variant={picker === "sticker" ? "secondary" : "ghost"}
          size="sm"
          className="shrink-0 px-2.5 text-xs font-semibold"
          onClick={() => setPicker((current) => (current === "sticker" ? null : "sticker"))}
          aria-label="Stickers"
        >
          🎨
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
          placeholder={placeholder}
        />
        <Button onClick={sendText}>Send</Button>
      </div>
    </div>
  );
}
