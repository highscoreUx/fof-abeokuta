"use client";

import { useCallback, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import type { ChatGameKind } from "@/lib/chat-game-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { toastError, toastSuccess } from "@/lib/toast";

interface StartChatGameButtonProps {
  channel: "DM" | "TEAM";
  peerUserId?: string;
  teamId?: string;
  disabled?: boolean;
  iconOnly?: boolean;
  menuPlacement?: "top" | "bottom";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CHAT_GAME_OPTIONS: Array<{ kind: ChatGameKind; label: string }> = [
  { kind: "tic_tac_toe", label: "X and O" },
  { kind: "hangman", label: "Hangman" },
  { kind: "spinner", label: "Spinner" },
];

export function useChatGameStarter({
  channel,
  peerUserId,
  teamId,
}: Pick<StartChatGameButtonProps, "channel" | "peerUserId" | "teamId">) {
  const { api } = useEventApi();
  const [busy, setBusy] = useState(false);

  const start = useCallback(
    async (kind: ChatGameKind) => {
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
        return true;
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Could not start game");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [api, channel, peerUserId, teamId],
  );

  return { start, busy };
}

export function ChatGameMenu({
  className,
  onSelect,
}: {
  className?: string;
  onSelect: (kind: ChatGameKind) => void;
}) {
  return (
    <div className={cn("min-w-[10rem] rounded-lg border border-border bg-card p-1 shadow-lg", className)}>
      {CHAT_GAME_OPTIONS.map((option) => (
        <button
          key={option.kind}
          type="button"
          className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
          onClick={() => onSelect(option.kind)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function StartChatGameButton({
  channel,
  peerUserId,
  teamId,
  disabled = false,
  iconOnly = false,
  menuPlacement = "bottom",
  open: controlledOpen,
  onOpenChange,
}: StartChatGameButtonProps) {
  const { start, busy } = useChatGameStarter({ channel, peerUserId, teamId });
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (value: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(value);
    }
    onOpenChange?.(value);
  };

  const handleSelect = async (kind: ChatGameKind) => {
    setOpen(false);
    await start(kind);
  };

  return (
    <div className="relative shrink-0">
      <Button
        type="button"
        size="sm"
        variant={open ? "secondary" : "ghost"}
        className={cn("shrink-0", iconOnly ? "px-2 sm:px-2.5" : undefined)}
        disabled={disabled || busy}
        onClick={() => setOpen(!open)}
        aria-label="Play a game"
        aria-expanded={open}
      >
        {iconOnly ? "🎮" : busy ? "Starting…" : "Play a game"}
      </Button>
      {open && (
        <ChatGameMenu
          className={cn(
            "absolute right-0 z-30",
            menuPlacement === "top" ? "bottom-full mb-1" : "top-full mt-1",
          )}
          onSelect={(kind) => void handleSelect(kind)}
        />
      )}
    </div>
  );
}
