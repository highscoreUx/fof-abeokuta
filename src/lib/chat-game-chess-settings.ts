export interface SocialChessSettings {
  /** Show arrows to legal destinations when a piece is selected. */
  showLegalMoves: boolean;
  turnTimerEnabled: boolean;
  turnTimerSeconds: number;
}

export const DEFAULT_SOCIAL_CHESS_SETTINGS: SocialChessSettings = {
  showLegalMoves: true,
  turnTimerEnabled: false,
  turnTimerSeconds: 60,
};

const TURN_SECONDS_MIN = 15;
const TURN_SECONDS_MAX = 600;

export function parseSocialChessSettings(raw: unknown): SocialChessSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SOCIAL_CHESS_SETTINGS };
  const value = raw as Partial<SocialChessSettings>;
  const turnTimerSeconds =
    typeof value.turnTimerSeconds === "number"
      ? Math.min(TURN_SECONDS_MAX, Math.max(TURN_SECONDS_MIN, Math.round(value.turnTimerSeconds)))
      : DEFAULT_SOCIAL_CHESS_SETTINGS.turnTimerSeconds;

  return {
    showLegalMoves: value.showLegalMoves !== false,
    turnTimerEnabled: Boolean(value.turnTimerEnabled),
    turnTimerSeconds,
  };
}

export function normalizeSocialChessSettingsInput(
  input: Partial<SocialChessSettings>,
): SocialChessSettings {
  return parseSocialChessSettings({ ...DEFAULT_SOCIAL_CHESS_SETTINGS, ...input });
}
