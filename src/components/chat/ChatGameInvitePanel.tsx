"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toastError, toastSuccess } from "@/lib/toast";

interface EventUserOption {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
}

interface ChatGameInvitePanelProps {
  sessionId: string;
  disabled?: boolean;
}

export function ChatGameInvitePanel({ sessionId, disabled = false }: ChatGameInvitePanelProps) {
  const { api } = useEventApi();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<EventUserOption[]>([]);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(() => new Set());
  const [displayInvited, addOptimisticInvite] = useOptimistic(
    invitedIds,
    (current, userId: string) => new Set(current).add(userId),
  );
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [, startInviteTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      const suffix = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
      api<{ users: EventUserOption[] }>(`/chat-games/invite-candidates${suffix}`)
        .then((data) => setUsers(data.users ?? []))
        .catch(() => setUsers([]));
    }, 250);

    return () => clearTimeout(timer);
  }, [api, query]);

  const invite = (userId: string) => {
    startInviteTransition(async () => {
      setInvitingId(userId);
      addOptimisticInvite(userId);
      try {
        await api(`/chat-games/${sessionId}`, {
          method: "POST",
          body: JSON.stringify({ action: "invite", inviteeUserIds: [userId] }),
        });
        setInvitedIds((prev) => new Set(prev).add(userId));
        toastSuccess("Invitation sent — they'll see it in your chat.");
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Could not invite spectator");
        throw error;
      } finally {
        setInvitingId(null);
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium">Invite spectators</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Invited people can open this game and watch, even outside this chat.
      </p>
      <Input
        className="mt-3"
        placeholder="Search by name or username"
        value={query}
        disabled={disabled || invitingId !== null}
        onChange={(event) => setQuery(event.target.value)}
      />
      {users.length > 0 && (
        <ul className="mt-2 space-y-1">
          {users.map((user) => {
            const invited = displayInvited.has(user.id);
            const inviting = invitingId === user.id;
            return (
              <li
                key={user.id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50"
              >
                <span className="text-sm">
                  {user.firstName} {user.lastName}
                  <span className="text-muted-foreground"> @{user.username}</span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={disabled || invited || inviting}
                  onClick={() => invite(user.id)}
                >
                  {invited ? "Invited" : inviting ? "Inviting…" : "Invite"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
