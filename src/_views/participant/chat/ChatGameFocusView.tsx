"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { TicTacToeMatchLive } from "@/components/tic-tac-toe/TicTacToeMatchLive";
import { HangmanMatchLive } from "@/components/hangman/HangmanMatchLive";
import { SpinnerLive } from "@/components/spinner/SpinnerLive";
import { SocialGameMatchLive } from "@/components/social-games/SocialGameMatchLive";
import { ChatGameInvitePanel } from "@/components/chat/ChatGameInvitePanel";
import { ChatGameCancelledResults } from "@/components/chat/ChatGameCancelledResults";
import { ChatGameTttHostSettings } from "@/components/chat/ChatGameTttHostSettings";
import { ChatGameHangmanHostSettings } from "@/components/chat/ChatGameHangmanHostSettings";
import { ChatGameChessHostSettings } from "@/components/chat/ChatGameChessHostSettings";
import { ChatGameLudoHostSettings } from "@/components/chat/ChatGameLudoHostSettings";
import { ChatGameWhotHostSettings } from "@/components/chat/ChatGameWhotHostSettings";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEventApi } from "@/hooks/useEventApi";
import { useEventNav } from "@/hooks/useEventNav";
import { useSocket } from "@/hooks/useSocket";
import { useChatGameSession } from "@/hooks/useChatGameSession";
import { hasAdminShellAccess } from "@/lib/permissions";
import type { ChatGameRematchPayload } from "@/lib/chat-game-types";
import { isSocialJsonGameKind } from "@/lib/social-games/kinds";

function RematchButton({
  sessionId,
  onRematch,
}: {
  sessionId: string;
  onRematch: (newSessionId: string) => void;
}) {
  const { api } = useEventApi();
  const [pending, setPending] = useState(false);

  const rematch = () => {
    setPending(true);
    void api<{ session: ChatGameSessionSnapshot }>(
      `/chat-games/${encodeURIComponent(sessionId)}`,
      {
        method: "POST",
        body: JSON.stringify({ action: "rematch" }),
      },
    )
      .then((data) => {
        onRematch(data.session.sessionId);
      })
      .catch(() => undefined)
      .finally(() => setPending(false));
  };

  return (
    <Button size="sm" disabled={pending} onClick={rematch}>
      {pending ? "Starting rematch…" : "Rematch"}
    </Button>
  );
}

export function ChatGameFocusView() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();
  const { user } = useAuth();
  const { api } = useEventApi();
  const { nav, participantNav, home } = useEventNav();
  const shellNav = user && hasAdminShellAccess(user.permissions) ? nav : participantNav;
  const socket = useSocket();
  const { session, loading } = useChatGameSession(sessionId);

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
  const isSocialGameHeader =
    (session?.kind === "tic_tac_toe" ||
      session?.kind === "hangman" ||
      session?.kind === "chess" ||
      session?.kind === "ludo" ||
      session?.kind === "whot" ||
      session?.kind === "eight_ball") &&
    (session?.status === "lobby" || session?.status === "live");

  const playerXName =
    session?.players.find((player) => player.slot === "X")?.firstName ?? "X";
  const playerOName =
    session?.players.find((player) => player.slot === "O")?.firstName ?? "O";
  const whitePlayerName =
    session?.players.find((player) => player.slot === "0" || player.slot === "X")?.firstName ??
    "White";
  const blackPlayerName =
    session?.players.find((player) => player.slot === "1" || player.slot === "O")?.firstName ??
    "Black";

  return (
    <PermissionGuard permission="participant.chat" allowAdminShell>
      <AppShell
        title={session?.title ?? "Game"}
        nav={shellNav}
        hideMobileTitle={isSocialGameHeader}
      >
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
            {isSocialGameHeader ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-xl font-semibold">{session.title}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    {isHost && session.kind === "tic_tac_toe" && (
                      <ChatGameTttHostSettings
                        sessionId={session.sessionId}
                        socialTtt={session.socialTtt}
                        playerXName={playerXName}
                        playerOName={playerOName}
                        lockedFormat={session.status === "live"}
                      />
                    )}
                    {isHost && session.kind === "hangman" && (
                      <ChatGameHangmanHostSettings
                        sessionId={session.sessionId}
                        socialHangman={session.socialHangman}
                        playerXName={playerXName}
                        playerOName={playerOName}
                        lockedFormat={session.status === "live"}
                      />
                    )}
                    {isHost && session.kind === "chess" && (
                      <ChatGameChessHostSettings
                        sessionId={session.sessionId}
                        socialChess={session.socialChess}
                        whitePlayerName={whitePlayerName}
                        blackPlayerName={blackPlayerName}
                        lockedFormat={session.status === "live"}
                      />
                    )}
                    {isHost && session.kind === "ludo" && (
                      <ChatGameLudoHostSettings
                        sessionId={session.sessionId}
                        socialLudo={session.socialLudo}
                        lockedFormat={session.status === "live"}
                      />
                    )}
                    {isHost && session.kind === "whot" && (
                      <ChatGameWhotHostSettings
                        sessionId={session.sessionId}
                        socialWhot={session.socialWhot}
                        lockedFormat={session.status === "live"}
                      />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`${home}?tab=chat`)}
                    >
                      Back to chat
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{session.text}</p>
              </div>
            ) : (
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
                    <RematchButton
                      sessionId={sessionId}
                      onRematch={(newSessionId) =>
                        router.replace(`${home}/game/${newSessionId}`)
                      }
                    />
                  )}
              </div>
            )}

            {session.status === "cancelled" ? (
              session.cancellation ? (
                <ChatGameCancelledResults
                  session={session}
                  cancellation={session.cancellation}
                />
              ) : (
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <p className="font-medium">Game cancelled</p>
                  <p className="mt-2 text-sm text-muted-foreground">{session.text}</p>
                </div>
              )
            ) : session.matchId &&
              session.challengeId &&
              (session.status === "live" || session.status === "ended") ? (
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
              ) : isSocialJsonGameKind(session.kind) ? (
                <SocialGameMatchLive
                  matchId={session.matchId}
                  kind={session.kind}
                  sessionId={session.sessionId}
                  chessSettings={session.socialChess?.settings}
                  ludoSettings={session.socialLudo?.settings}
                  whotSettings={session.socialWhot?.settings}
                  turnDeadlineAt={
                    session.socialLudo?.turnDeadlineAt ?? session.socialWhot?.turnDeadlineAt
                  }
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
                    {session.kind === "spinner" &&
                    (session.channel === "TEAM" ||
                      session.channel === "GENERAL" ||
                      session.channel === "STAFF")
                      ? "Waiting for others to join. The host can start when at least two players are in."
                      : session.maxPlayers > 2
                        ? `Waiting for players (${session.players.length}/${session.maxPlayers}). Join from the chat card.`
                        : "Waiting for another player to join from the chat card."}
                  </p>
                  {session.kind !== "tic_tac_toe" && session.kind !== "hangman" && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`${home}?tab=chat`)}
                      >
                        Back to chat
                      </Button>
                    </div>
                  )}
                </div>
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
