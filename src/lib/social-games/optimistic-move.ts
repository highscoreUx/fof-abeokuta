import type { SocialWhotSettings } from "@/lib/chat-game-whot-settings";
import { getSocialGameHandler } from "@/server/games/social/registry";
import type { SocialGameMatchSnapshot } from "@/lib/social-games/types";

export interface OptimisticSocialGameOptions {
  whotSettings?: SocialWhotSettings;
}

export function applyOptimisticSocialGameMove(
  snapshot: SocialGameMatchSnapshot,
  userId: string,
  action: string,
  payload: Record<string, unknown>,
  options?: OptimisticSocialGameOptions,
): SocialGameMatchSnapshot {
  if (snapshot.kind === "ludo" && action === "roll") {
    return snapshot;
  }

  const handler = getSocialGameHandler(snapshot.kind);
  if (!handler) return snapshot;

  const seatByUserId: Record<string, string> = {};
  for (const player of snapshot.players) {
    seatByUserId[player.userId] = player.seat;
  }

  const settings: Record<string, unknown> = options?.whotSettings
    ? ({ ...options.whotSettings } as Record<string, unknown>)
    : {};

  const result = handler.applyMove(snapshot.state, {
    userId,
    action,
    payload,
    playerIds: snapshot.players.map((player) => player.userId),
    seatByUserId,
    settings,
  });

  if (result.error) return snapshot;

  const finished = Boolean(result.winnerUserId || result.isDraw);

  return {
    ...snapshot,
    state: result.state,
    currentTurnUserId: finished ? null : result.nextTurnUserId,
    winnerUserId: result.winnerUserId,
    status: finished ? "FINISHED" : snapshot.status,
  };
}
