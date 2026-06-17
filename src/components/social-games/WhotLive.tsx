"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";
import type { WhotShape, WhotState } from "@/lib/social-games/game-state-types";
import {
  WhotCardBackStack,
  WhotPlayingCard,
  WhotShapePicker,
} from "@/components/social-games/WhotPlayingCard";
import { WHOT_SHAPE_LABELS } from "@/lib/social-games/whot-card-styles";

function playerName(snapshot: SocialGameMatchSnapshot, userId: string | null | undefined) {
  if (!userId) return "Player";
  const player = snapshot.players.find((entry) => entry.userId === userId);
  return player?.firstName ?? "Player";
}

export function WhotLive({
  snapshot,
  sendMove,
}: {
  snapshot: SocialGameMatchSnapshot;
  sendMove: (action: string, payload?: Record<string, unknown>) => void;
}) {
  const { user } = useAuth();
  const game = snapshot.state as WhotState;
  const hand = user?.id ? (game.hands[user.id] ?? []) : [];
  const top = game.discard[0];
  const isMyTurn = snapshot.currentTurnUserId === user?.id;
  const finished = snapshot.status === "FINISHED";
  const [pendingWhot, setPendingWhot] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const opponents = useMemo(
    () => snapshot.players.filter((player) => player.userId !== user?.id),
    [snapshot.players, user?.id],
  );

  const playCard = (cardId: string, shape?: WhotShape) => {
    sendMove("play", shape ? { cardId, shape } : { cardId });
    setPendingWhot(null);
    setSelectedCardId(null);
  };

  const calledShapeLabel =
    game.currentShape && game.currentShape !== "whot"
      ? WHOT_SHAPE_LABELS[game.currentShape]
      : null;

  return (
    <Card className="overflow-hidden border-0 bg-transparent p-0 shadow-none">
      <div className="rounded-2xl bg-gradient-to-b from-[#1b5e3b] to-[#0d3d24] p-4 shadow-inner sm:p-6">
        <CardTitle className="mb-4 text-center text-base text-emerald-50">
          {finished
            ? `${playerName(snapshot, snapshot.winnerUserId)} wins!`
            : isMyTurn
              ? "Your turn — play a card or draw"
              : `${playerName(snapshot, snapshot.currentTurnUserId)}'s turn`}
        </CardTitle>

        {/* Opponents */}
        <div className="mb-6 flex flex-wrap justify-center gap-6">
          {opponents.map((opponent) => {
            const count = game.hands[opponent.userId]?.length ?? 0;
            const isActive = snapshot.currentTurnUserId === opponent.userId;
            return (
              <div
                key={opponent.userId}
                className={`flex flex-col items-center gap-1 ${isActive ? "opacity-100" : "opacity-80"}`}
              >
                <div className="flex -space-x-6">
                  {Array.from({ length: Math.min(count, 4) }).map((_, index) => (
                    <div key={index} className="drop-shadow-md" style={{ zIndex: index }}>
                      <WhotPlayingCard faceDown size="sm" />
                    </div>
                  ))}
                </div>
                <span
                  className={`text-xs font-medium ${isActive ? "text-amber-200" : "text-emerald-100/80"}`}
                >
                  {opponent.firstName} · {count} cards
                </span>
              </div>
            );
          })}
        </div>

        {/* Table center: draw pile + discard */}
        <div className="mb-6 flex items-end justify-center gap-8 sm:gap-12">
          <WhotCardBackStack count={game.deck.length} label="Draw pile" />
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100/70">
              Play pile
            </p>
            {top ? (
              <div className="relative">
                {game.discard.length > 1 && (
                  <div className="absolute -left-1 -top-1 rotate-[-6deg] opacity-60">
                    <WhotPlayingCard card={game.discard[1]} size="lg" />
                  </div>
                )}
                <div className="relative z-10 drop-shadow-xl">
                  <WhotPlayingCard card={top} size="lg" />
                </div>
              </div>
            ) : (
              <div className="flex h-36 w-24 items-center justify-center rounded-lg border-2 border-dashed border-white/20 text-sm text-emerald-100/50">
                Empty
              </div>
            )}
            {calledShapeLabel && (
              <p className="rounded-full bg-black/30 px-3 py-1 text-xs text-amber-200">
                Called: <span className="text-lg">{calledShapeLabel}</span>
              </p>
            )}
          </div>
        </div>

        {/* Player hand */}
        <div className="rounded-xl bg-black/20 p-3 sm:p-4">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-emerald-100/70">
            Your hand
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {hand.map((card, index) => (
              <button
                key={card.id}
                type="button"
                disabled={!isMyTurn || finished}
                onClick={() => {
                  setSelectedCardId(card.id);
                  if (card.shape === "whot") {
                    setPendingWhot(card.id);
                    return;
                  }
                  playCard(card.id);
                }}
                className="transition hover:-translate-y-2 hover:scale-105 disabled:opacity-50 disabled:hover:translate-y-0"
                style={{
                  transform: `rotate(${(index - hand.length / 2) * 4}deg)`,
                }}
              >
                <WhotPlayingCard
                  card={card}
                  size="md"
                  selected={selectedCardId === card.id}
                />
              </button>
            ))}
          </div>
        </div>

        {pendingWhot && (
          <div className="mt-4 space-y-2 rounded-xl bg-black/30 p-4">
            <p className="text-center text-sm text-amber-100">Choose a shape for your Whot card</p>
            <WhotShapePicker onPick={(shape) => playCard(pendingWhot, shape)} />
            <div className="text-center">
              <Button size="sm" variant="ghost" className="text-emerald-100" onClick={() => setPendingWhot(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isMyTurn && !finished && !pendingWhot && (
          <div className="mt-4 flex justify-center">
            <Button
              size="sm"
              className="bg-amber-500 text-black hover:bg-amber-400"
              onClick={() => sendMove("draw")}
            >
              Draw from pile
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
