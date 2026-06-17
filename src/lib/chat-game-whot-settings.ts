export interface SocialWhotSettings {
  /** Cards dealt to each player at the start (Nigerian games often use 3–6). */
  cardsPerPlayer: number;
  /** Require "semi last card" / "last card" calls; penalise if omitted. */
  enforceLastCardCall: boolean;
  /** Cards drawn when a player forgets to call last card. */
  lastCardPenaltyCards: number;
  turnTimerEnabled: boolean;
  turnTimerSeconds: number;
  /** Pick Two (2) is always active. If false, the next player must draw — cannot block with another 2. */
  pick2AllowBlock: boolean;
  /** Only when blocking is allowed. If false, one 2 block clears the penalty (no stacking). */
  pick2AllowStacking: boolean;
  /** Enable Pick Three (5) special rule. Off by default — 5 is a normal card. */
  allowPick3: boolean;
  /** Only when Pick Three is enabled. If false, the next player must draw — cannot block with a 5. */
  pick3AllowBlock: boolean;
  /** Only when Pick Three blocking is allowed. If false, one 5 block clears the penalty. */
  pick3AllowStacking: boolean;
  /** Enable Suspension (8) / Star 8 skip. Off by default — 8 is a normal card. */
  allowSuspension: boolean;
}

export const DEFAULT_SOCIAL_WHOT_SETTINGS: SocialWhotSettings = {
  cardsPerPlayer: 6,
  enforceLastCardCall: true,
  lastCardPenaltyCards: 2,
  turnTimerEnabled: false,
  turnTimerSeconds: 45,
  pick2AllowBlock: true,
  pick2AllowStacking: true,
  allowPick3: false,
  pick3AllowBlock: true,
  pick3AllowStacking: true,
  allowSuspension: false,
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
    pick2AllowBlock: value.pick2AllowBlock !== false,
    pick2AllowStacking: value.pick2AllowStacking !== false,
    allowPick3: Boolean(value.allowPick3),
    pick3AllowBlock: value.pick3AllowBlock !== false,
    pick3AllowStacking: value.pick3AllowStacking !== false,
    allowSuspension: Boolean(value.allowSuspension),
  };
}

export type WhotRuleSettings = Pick<
  SocialWhotSettings,
  | "pick2AllowBlock"
  | "pick2AllowStacking"
  | "allowPick3"
  | "pick3AllowBlock"
  | "pick3AllowStacking"
  | "allowSuspension"
>;

export function whotRuleSettings(settings: SocialWhotSettings): WhotRuleSettings {
  return {
    pick2AllowBlock: settings.pick2AllowBlock,
    pick2AllowStacking: settings.pick2AllowStacking,
    allowPick3: settings.allowPick3,
    pick3AllowBlock: settings.pick3AllowBlock,
    pick3AllowStacking: settings.pick3AllowStacking,
    allowSuspension: settings.allowSuspension,
  };
}
