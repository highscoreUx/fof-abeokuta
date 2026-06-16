"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { TicTacToeMatchLive } from "@/components/tic-tac-toe/TicTacToeMatchLive";
import { HangmanMatchLive } from "@/components/hangman/HangmanMatchLive";
import { SpinnerLive } from "@/components/spinner/SpinnerLive";
import { ChatGameInvitePanel } from "@/components/chat/ChatGameInvitePanel";
import { ChatGameTttHostSettings } from "@/components/chat/ChatGameTttHostSettings";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { useSocket } from "@/hooks/useSocket";
import { hasAdminShellAccess } from "@/lib/permissions";
import type { ChatGameRematchPayload, ChatGameSessionSnapshot } from "@/lib/chat-game-types";

export function ChatGameFocusView() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();
  const { user } = useAuth();
  const { api } = useEventApi();
  const { nav, participantNav, home } = useEventNav();
  const shellNav = user && hasAdminShellAccess(user.permissions) ? nav : participantNav;
  const socket = useSocket();
  const [session, setSession] = useState<ChatGameSessionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api<{ session: ChatGameSessionSnapshot }>(
        `/chat-games/${encodeURIComponent(sessionId)}`,
      );
      setSession(data.session);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api, sessionId]);

  useEffect(() => {
    if (!socket) return;

    const onState = (snapshot: ChatGameSessionSnapshot) => {
      if (snapshot.sessionId !== sessionId) return;
      setSession(snapshot);
    };

    socket.on("chat:game:state", onState);
    return () => {
      socket.off("chat:game:state", onState);
    };
  }, [socket, sessionId]);

  useEffect(() => {
    if (!socket || !user) return;

    const onRematch = (payload: ChatGameRematchPayload) => {
      if (payload.fromSessionId !== sessionId) return;
      const wasPlayer = payload.session.players.some((player) => player.userId === user.id);
      if (!wasPlayer) return;
      router.replace(`${home}/game/${payload.session.sessionId}`);
    };

    socket.on("chat:game:rematch", onRematch);
    return () => {
      socket.off("chat:game:rematch", onRematch);
    };
  }, [socket, sessionId, user, home, router]);

  useEffect(() => {
    if (!session || !user) return;
    const isPlayer = session.players.some((player) => player.userId === user.id);
    if (isPlayer || user.id === session.hostUserId) return;

    void api(`/chat-games/${encodeURIComponent(sessionId)}`, {
      method: "POST",
      body: JSON.stringify({ action: "join", asSpectator: true }),
    }).catch(() => undefined);
  }, [api, session, sessionId, user]);

  const isPlayer = Boolean(
    user && session?.players.some((player) => player.userId === user.id),
  );
  const isHost = user?.id === session?.hostUserId;

  return (
    <PermissionGuard permission="participant.chat" allowAdminShell>
      <AppShell title={session?.title ?? "Game"} nav={shellNav}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading game…</p>
        ) : !session ? (
          <div className="space-y-4 text-center">
            <p className="font-medium">Game not found</p>
            <Button variant="secondary" onClick={() => router.push(`${home}?tab=chat`)}>
              Back to chat
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="hidden text-xl font-semibold sm:block">{session.title}</h1>
                <p className="text-sm text-muted-foreground">{session.text}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push(`${home}?tab=chat`)}>
                Back to chat
              </Button>
              {session.status === "ended" &&
                session.players.some((player) => player.userId === user?.id) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      void api<{ session: ChatGameSessionSnapshot }>(
                        `/chat-games/${encodeURIComponent(sessionId)}`,
                        {
                          method: "POST",
                          body: JSON.stringify({ action: "rematch" }),
                        },
                      ).then((data) => {
                        router.replace(`${home}/game/${data.session.sessionId}`);
                      });
                    }}
                  >
                    Rematch
                  </Button>
                )}
            </div>

            {session.matchId && session.challengeId ? (
              session.kind === "hangman" ? (
                <HangmanMatchLive
                  challengeId={session.challengeId}
                  initialMatchId={session.matchId}
                  socialSessionId={session.sessionId}
                />
              ) : session.kind === "spinner" ? (
                <SpinnerLive
                  challengeId={session.challengeId}
                  initialSessionId={session.matchId}
                  socialSessionId={session.sessionId}
                />
              ) : (
                <TicTacToeMatchLive
                  challengeId={session.challengeId}
                  initialMatchId={session.matchId}
                  socialSessionId={session.sessionId}
                />
              )
            ) : session.status === "lobby" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {session.kind === "spinner" && session.channel === "TEAM"
                      ? "Waiting for teammates to join. The host can start when at least two players are in."
                      : "Waiting for another player to join from the chat card."}
                  </p>
                </div>
                {session.kind === "tic_tac_toe" && isHost && (
                  <ChatGameTttHostSettings
                    sessionId={session.sessionId}
                    socialTtt={session.socialTtt}
                    playerXName={
                      session.players.find((player) => player.slot === "X")?.firstName ?? "X"
                    }
                    playerOName={
                      session.players.find((player) => player.slot === "O")?.firstName ?? "O"
                    }
                  />
                )}
                {isPlayer && <ChatGameInvitePanel sessionId={session.sessionId} />}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">Game unavailable.</p>
              </div>
            )}

            {session.status === "live" && isPlayer && (
              <ChatGameInvitePanel sessionId={session.sessionId} />
            )}
          </div>
        )}
      </AppShell>
    </PermissionGuard>
  );
}
