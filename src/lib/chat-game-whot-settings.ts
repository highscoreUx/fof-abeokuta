export interface SocialWhotSettings {
  /** Cards dealt to each player at the start (Nigerian games often use 3–6). */
  cardsPerPlayer: number;
  /** Require "semi last card" / "last card" calls; penalise if omitted. */
  enforceLastCardCall: boolean;
  /** Cards drawn when a player forgets to call last card. */
  lastCardPenaltyCards: number;
  turnTimerEnabled: boolean;
  turnTimerSeconds: number;
}

export const DEFAULT_SOCIAL_WHOT_SETTINGS: SocialWhotSettings = {
  cardsPerPlayer: 6,
  enforceLastCardCall: true,
  lastCardPenaltyCards: 2,
  turnTimerEnabled: false,
  turnTimerSeconds: 45,
};

const CARDS_PER_PLAYER_MIN = 3;
const CARDS_PER_PLAYER_MAX = 6;
const TURN_SECONDS_MIN = 15;
const TURN_SECONDS_MAX = 600;
const PENALTY_CARDS_MIN = 1;
const PENALTY_CARDS_MAX = 5;

export function parseSocialWhotSettings(raw: unknown): SocialWhotSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SOCIAL_WHOT_SETTINGS };
  const value = raw as Partial<SocialWhotSettings>;

  const cardsPerPlayer =
    typeof value.cardsPerPlayer === "number"
      ? Math.min(
          CARDS_PER_PLAYER_MAX,
          Math.max(CARDS_PER_PLAYER_MIN, Math.round(value.cardsPerPlayer)),
        )
      : DEFAULT_SOCIAL_WHOT_SETTINGS.cardsPerPlayer;

  const turnTimerSeconds =
    typeof value.turnTimerSeconds === "number"
      ? Math.min(TURN_SECONDS_MAX, Math.max(TURN_SECONDS_MIN, Math.round(value.turnTimerSeconds)))
      : DEFAULT_SOCIAL_WHOT_SETTINGS.turnTimerSeconds;

  const lastCardPenaltyCards =
    typeof value.lastCardPenaltyCards === "number"
      ? Math.min(
          PENALTY_CARDS_MAX,
          Math.max(PENALTY_CARDS_MIN, Math.round(value.lastCardPenaltyCards)),
        )
      : DEFAULT_SOCIAL_WHOT_SETTINGS.lastCardPenaltyCards;

  return {
    cardsPerPlayer,
    enforceLastCardCall: value.enforceLastCardCall !== false,
    lastCardPenaltyCards,
    turnTimerEnabled: Boolean(value.turnTimerEnabled),
    turnTimerSeconds,
  };
}
