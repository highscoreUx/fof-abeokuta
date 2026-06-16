"use client";

import { useEffect, useRef, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import type { ChatGameKind } from "@/lib/chat-game-types";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";

interface StartChatGameButtonProps {
  channel: "DM" | "TEAM";
  peerUserId?: string;
  teamId?: string;
  disabled?: boolean;
}

const GAME_OPTIONS: Array<{ kind: ChatGameKind; label: string }> = [
  { kind: "tic_tac_toe", label: "X and O" },
  { kind: "hangman", label: "Hangman" },
  { kind: "spinner", label: "Spinner" },
];

export function StartChatGameButton({
  channel,
  peerUserId,
  teamId,
  disabled = false,
}: StartChatGameButtonProps) {
  const { api } = useEventApi();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const start = async (kind: ChatGameKind) => {
    setOpen(false);
    setBusy(true);
    try {
      await api("/chat-games", {
        method: "POST",
        body: JSON.stringify({
          kind,
          channel,
          peerUserId: channel === "DM" ? peerUserId : undefined,
          teamId: channel === "TEAM" ? teamId : undefined,
        }),
      });
      toastSuccess("Game posted to chat");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Could not start game");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled || busy}
        onClick={() => setOpen((value) => !value)}
      >
        {busy ? "Starting…" : "Play a game"}
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-lg border border-border bg-card p-1 shadow-lg">
          {GAME_OPTIONS.map((option) => (
            <button
              key={option.kind}
              type="button"
              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => void start(option.kind)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
