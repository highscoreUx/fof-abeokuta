"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { SocialWhotSettings } from "@/lib/chat-game-whot-settings";
import { DEFAULT_SOCIAL_WHOT_SETTINGS, whotRuleSettings } from "@/lib/chat-game-whot-settings";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";
import type { WhotShape } from "@/lib/social-games/game-state-types";
import { prepareWhotStateForPlay } from "@/lib/social-games/whot-helpers";
import { canPlayWhotCard } from "@/lib/social-games/whot-rules";
import { whotHandPoints } from "@/lib/social-games/whot-scoring";
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

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function WhotLive({
  snapshot,
  sendMove,
  whotSettings = DEFAULT_SOCIAL_WHOT_SETTINGS,
  turnDeadlineAt,
}: {
  snapshot: SocialGameMatchSnapshot;
  sendMove: (action: string, payload?: Record<string, unknown>) => void;
  whotSettings?: SocialWhotSettings;
  turnDeadlineAt?: number | null;
}) {
  const { user } = useAuth();
  const game = useMemo(
    () => prepareWhotStateForPlay(snapshot.state, snapshot.players.map((p) => p.userId)),
    [snapshot.state, snapshot.players],
  );
  const hand = user?.id ? (game.hands[user.id] ?? []) : [];
  const top = game.discard[0];
  const isMyTurn = snapshot.currentTurnUserId === user?.id;
  const finished = snapshot.status === "FINISHED";
  const [pendingWhot, setPendingWhot] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const opponents = useMemo(
    () => snapshot.players.filter((player) => player.userId !== user?.id),
    [snapshot.players, user?.id],
  );

  useEffect(() => {
    if (!whotSettings.turnTimerEnabled || !turnDeadlineAt || finished) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [whotSettings.turnTimerEnabled, turnDeadlineAt, finished]);

  const secondsLeft =
    whotSettings.turnTimerEnabled && turnDeadlineAt
      ? Math.max(0, Math.ceil((turnDeadlineAt - now) / 1000))
      : null;

  const playCard = (cardId: string, shape?: WhotShape) => {
    sendMove("play", shape ? { cardId, shape } : { cardId });
    setPendingWhot(null);
    setSelectedCardId(null);
  };

  const calledShapeLabel =
    game.currentShape && game.currentShape !== "whot"
      ? WHOT_SHAPE_LABELS[game.currentShape]
      : null;

  const rules = useMemo(() => whotRuleSettings(whotSettings), [whotSettings]);

  const pickLabel = useMemo(() => {
    if (!game.pickPenalty) return null;
    const count =
      game.pickPenalty.stack * (game.pickPenalty.kind === "two" ? 2 : 3);
    if (game.pickPenalty.kind === "two") {
      if (!rules.pick2AllowBlock) return `Pick ${count} — draw only (blocking disabled)`;
      if (!rules.pick2AllowStacking) {
        return `Pick ${count} — block with a 2 (no stacking) or draw`;
      }
      return `Pick ${count} — play a 2 or draw`;
    }
    if (!rules.pick3AllowBlock) return `Pick ${count} — draw only (blocking disabled)`;
    if (!rules.pick3AllowStacking) {
      return `Pick ${count} — block with a 5 (no stacking) or draw`;
    }
    return `Pick ${count} — play a 5 or draw`;
  }, [game.pickPenalty, rules]);

  const myCall = user?.id ? (game.calledLastCard[user.id] ?? null) : null;
  const showSemiCall = whotSettings.enforceLastCardCall && hand.length === 2 && myCall !== "semi";
  const showLastCall = whotSettings.enforceLastCardCall && hand.length === 1 && myCall !== "last";

  const marketEmpty = game.deck.length === 0;
  const tenderImminent = whotSettings.allowTender && marketEmpty && !finished;

  const titleText = finished
    ? game.endedByTender
      ? `${playerName(snapshot, snapshot.winnerUserId)} wins on tender!`
      : `${playerName(snapshot, snapshot.winnerUserId)} wins!`
    : isMyTurn
      ? "Your turn — play a card or draw"
      : `${playerName(snapshot, snapshot.currentTurnUserId)}'s turn`;

  return (
    <Card className="overflow-hidden border-0 bg-transparent p-0 shadow-none">
      <div className="rounded-2xl bg-gradient-to-b from-[#1b5e3b] to-[#0d3d24] p-4 shadow-inner sm:p-6">
        <CardTitle className="mb-2 text-center text-base text-emerald-50">{titleText}</CardTitle>

        {tenderImminent && (
          <p className="mb-2 text-center text-xs font-medium text-amber-200">
            Market empty — next draw ends the round (lowest total wins)
          </p>
        )}

        {finished && game.tenderTotals && (
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {snapshot.players.map((player) => (
              <span
                key={player.userId}
                className={`rounded-full px-3 py-1 text-xs ${
                  player.userId === snapshot.winnerUserId
                    ? "bg-amber-400 font-semibold text-black"
                    : "bg-black/30 text-emerald-100"
                }`}
              >
                {player.firstName}: {game.tenderTotals![player.userId] ?? "—"} pts
              </span>
            ))}
          </div>
        )}

        {secondsLeft != null && isMyTurn && !finished && (
          <p className="mb-3 text-center text-sm font-medium text-amber-200">
            Time left: {formatTimer(secondsLeft)}
          </p>
        )}

        {pickLabel && (
          <p className="mb-3 text-center text-sm font-semibold text-amber-300">{pickLabel}</p>
        )}

        {tenderImminent && (
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {snapshot.players.map((player) => (
              <span
                key={player.userId}
                className="rounded-full bg-black/25 px-2 py-0.5 text-[11px] text-emerald-100/90"
              >
                {player.firstName}: {whotHandPoints(game.hands[player.userId] ?? [])} pts
              </span>
            ))}
          </div>
        )}

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

        {/* Table center */}
        <div className="mb-6 flex items-end justify-center gap-8 sm:gap-12">
          <WhotCardBackStack count={game.deck.length} label="Market" />
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
            Your hand · {hand.length} cards
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {hand.map((card, index) => {
              const playable =
                isMyTurn &&
                !finished &&
                canPlayWhotCard(card, top, game.currentShape, game.pickPenalty, rules);
              return (
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
                    if (playable) playCard(card.id);
                  }}
                  className={`transition disabled:opacity-50 ${
                    playable ? "hover:-translate-y-2 hover:scale-105" : "opacity-70"
                  }`}
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
              );
            })}
          </div>
        </div>

        {pendingWhot && (
          <div className="mt-4 space-y-2 rounded-xl bg-black/30 p-4">
            <p className="text-center text-sm text-amber-100">Choose a shape for your Whot card</p>
            <WhotShapePicker onPick={(shape) => playCard(pendingWhot, shape)} />
            <div className="text-center">
              <Button
                size="sm"
                variant="ghost"
                className="text-emerald-100"
                onClick={() => setPendingWhot(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isMyTurn && !finished && !pendingWhot && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {showSemiCall && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400 text-amber-100"
                onClick={() => sendMove("announce", { call: "semi" })}
              >
                Semi last card!
              </Button>
            )}
            {showLastCall && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400 text-amber-100"
                onClick={() => sendMove("announce", { call: "last" })}
              >
                Last card!
              </Button>
            )}
            <Button
              size="sm"
              className="bg-amber-500 text-black hover:bg-amber-400"
              onClick={() => sendMove("draw")}
            >
              {game.pickPenalty ? "Draw penalty" : "Draw from market"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
