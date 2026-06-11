"use client";

import { useEffect, useState } from "react";
import type { ChatRoom } from "@/components/chat/ChatPanel";
import { useEventApi } from "@/hooks/useEventApi";
import { cn } from "@/lib/cn";

export interface ChatParticipant {
  id: string;
  firstName: string;
  lastName: string;
  teamLetter: string | null;
  roleName: string;
}

interface ChatParticipantsProps {
  room: ChatRoom;
  className?: string;
}

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function ChatParticipants({ room, className }: ChatParticipantsProps) {
  const { api } = useEventApi();
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<{ participants: ChatParticipant[] }>(`/chat/rooms/${room.id}/participants`)
      .then((data) => setParticipants(data.participants))
      .catch(() => setParticipants([]))
      .finally(() => setLoading(false));
  }, [api, room.id]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col border-t border-border", className)}>
      <div className="shrink-0 px-4 py-3">
        <h4 className="text-sm font-semibold text-foreground">Participants</h4>
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading..." : `${participants.length} in ${room.label}`}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {!loading && participants.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">No participants yet.</p>
        ) : (
          <ul className="space-y-1">
            {participants.map((person) => (
              <li
                key={person.id}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(person.firstName, person.lastName)}
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
