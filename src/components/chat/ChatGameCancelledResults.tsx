"use client";

import { ChatGameResultHero } from "@/components/chat/ChatGameResultHero";
import { Card } from "@/components/ui/card";
import type { ChatGameCancellationMeta } from "@/lib/chat-game-cancellation";
import type { ChatGameSessionSnapshot } from "@/lib/chat-game-types";

function winnerName(
  session: ChatGameSessionSnapshot,
  cancellation: ChatGameCancellationMeta,
) {
  if (!cancellation.winnerUserId) return null;
  const winner = session.players.find((player) => player.userId === cancellation.winnerUserId);
  return winner ? `${winner.firstName} ${winner.lastName}`.trim() : "Winner";
}

export function ChatGameCancelledResults({
  session,
  cancellation,
}: {
  session: ChatGameSessionSnapshot;
  cancellation: ChatGameCancellationMeta;
}) {
  const winner = winnerName(session, cancellation);
  const raceScore =
    session.socialTtt?.settings.seriesMode === "race"
      ? session.socialTtt.score
      : session.socialHangman?.settings.seriesMode === "race"
        ? session.socialHangman.score
        : null;

  return (
    <div className="space-y-4">
      <ChatGameResultHero
        eyebrow="Game cancelled"
        title={winner ? `${winner} wins` : "Game cancelled"}
        subtitle={
          winner
            ? "The other player wins by forfeit."
            : "This game was cancelled before a winner could be decided."
        }
        celebrate={Boolean(winner)}
      />
      <Card className="p-4 text-sm text-muted-foreground">
        <p>{session.text}</p>
        {raceScore && winner && (
          <p className="mt-2 font-medium text-foreground">
            Final score {raceScore.x} – {raceScore.o}
          </p>
        )}
      </Card>
    </div>
  );
}
