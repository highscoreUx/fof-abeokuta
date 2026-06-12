"use client";

import { useEffect } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { cn } from "@/lib/cn";
import { EMPTY_CHAT_PARTICIPANTS, useChatStore } from "@/stores/chatStore";
import type { ChatParticipant, ChatRoom } from "@/types/chat";

interface ChatParticipantsProps {
  room: ChatRoom;
  isActive: boolean;
  className?: string;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function ChatParticipants({ room, isActive, className }: ChatParticipantsProps) {
  const { api } = useEventApi();

  const participants = useChatStore(
    (s) => s.participantsByRoom[room.id] ?? EMPTY_CHAT_PARTICIPANTS,
  );
  const participantsLoaded = useChatStore((s) => s.participantsLoaded[room.id] ?? false);
  const setParticipants = useChatStore((s) => s.setParticipants);
  const setOnlineUserIds = useChatStore((s) => s.setOnlineUserIds);
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const markParticipantsLoaded = useChatStore((s) => s.markParticipantsLoaded);

  useEffect(() => {
    if (participantsLoaded) return;

    api<{ participants: ChatParticipant[] }>(`/chat/rooms/${room.id}/participants`)
      .then((data) => {
        setParticipants(room.id, data.participants);
        setOnlineUserIds(
          data.participants.filter((person) => person.online).map((person) => person.id),
        );
        markParticipantsLoaded(room.id);
      })
      .catch(() => {
        setParticipants(room.id, []);
        markParticipantsLoaded(room.id);
      });
  }, [
    api,
    room.id,
    participantsLoaded,
    setParticipants,
    setOnlineUserIds,
    markParticipantsLoaded,
  ]);

  const onlineCount = participants.filter(
    (person) => person.online || onlineUserIds[person.id],
  ).length;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col border-t border-border",
        !isActive && "hidden",
        className,
      )}
      aria-hidden={!isActive}
    >
      <div className="shrink-0 px-4 py-3">
        <h4 className="text-sm font-semibold text-foreground">Participants</h4>
        <p className="text-xs text-muted-foreground">
          {!participantsLoaded
            ? "Loading..."
            : `${participants.length} in ${room.label}${onlineCount > 0 ? ` · ${onlineCount} online` : ""}`}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {participantsLoaded && participants.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">No participants yet.</p>
        ) : (
          <ul className="space-y-1">
            {participants.map((person) => {
              const isOnline = Boolean(person.online || onlineUserIds[person.id]);
              return (
              <li
                key={person.id}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/60"
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(person.firstName, person.lastName)}
                  {isOnline && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success"
                      aria-label="Online"
                    />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {person.firstName} {person.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {person.teamLetter ? `Team ${person.teamLetter}` : person.roleName}
                  </p>
                </div>
              </li>
            );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
