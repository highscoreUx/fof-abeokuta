"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import type { ChatGameKind } from "@/lib/chat-game-types";
import {
  createOptimisticChatGameBody,
  roomIdForChatGameChannel,
} from "@/lib/chat-game-optimistic";
import { chatGameOptions, type ChatGameChannel } from "@/lib/activities/manifest";
import { createOptimisticChatMessage } from "@/lib/chat-optimistic";
import { serializeChatContent } from "@/lib/chat-content";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { toastError, toastSuccess } from "@/lib/toast";
import { useChatStore } from "@/stores/chatStore";
import type { ChatRoom } from "@/types/chat";

interface StartChatGameButtonProps {
  channel: ChatGameChannel;
  peerUserId?: string;
  teamId?: string;
  room?: ChatRoom;
  disabled?: boolean;
  iconOnly?: boolean;
  menuPlacement?: "top" | "bottom";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function roomFromChannel(
  channel: ChatGameChannel,
  roomId: string,
): ChatRoom {
  return {
    id: roomId,
    category:
      channel === "DM"
        ? "private"
        : channel === "TEAM"
          ? "team"
          : channel === "STAFF"
            ? "staff"
            : "general",
    label: "Chat",
  };
}

export function useChatGameStarter({
  channel,
  peerUserId,
  teamId,
  room,
}: Pick<StartChatGameButtonProps, "channel" | "peerUserId" | "teamId" | "room">) {
  const { api } = useEventApi();
  const { user } = useAuth();
  const appendMessage = useChatStore((state) => state.appendMessage);
  const removeMessage = useChatStore((state) => state.removeMessage);
  const [busy, setBusy] = useState(false);

  const start = useCallback(
    async (kind: ChatGameKind) => {
      if (!user) return false;
      setBusy(true);

      const roomId = room?.id ?? roomIdForChatGameChannel(channel, { peerUserId, teamId });
      const gameBody = createOptimisticChatGameBody(kind, user);
      const optimisticMessage = createOptimisticChatMessage(
        serializeChatContent({ type: "chat_game", chatGame: gameBody }),
        user,
        room ?? roomFromChannel(channel, roomId),
      );

      appendMessage(roomId, optimisticMessage);

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
        removeMessage(roomId, optimisticMessage.id);
        toastError(error instanceof Error ? error.message : "Could not start game");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [api, channel, peerUserId, teamId, room, user, appendMessage, removeMessage],
  );

  return { start, busy };
}

export function ChatGameMenu({
  className,
  channel,
  onSelect,
}: {
  className?: string;
  channel: ChatGameChannel;
  onSelect: (kind: ChatGameKind) => void;
}) {
  const options = chatGameOptions(channel);

  if (options.length === 0) return null;

  return (
    <div className={cn("min-w-[10rem] rounded-lg border border-border bg-card p-1 shadow-lg", className)}>
      {options.map((option) => (
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
  room,
  disabled = false,
  iconOnly = false,
  menuPlacement = "bottom",
  open: controlledOpen,
  onOpenChange,
}: StartChatGameButtonProps) {
  const { start, busy } = useChatGameStarter({ channel, peerUserId, teamId, room });
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const hasGameOptions = chatGameOptions(channel).length > 0;

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

  if (!hasGameOptions) return null;

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
          channel={channel}
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
