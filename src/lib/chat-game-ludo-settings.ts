export interface SocialLudoSettings {
  /** Animate seeds moving one square at a time (off = jump to destination). */
  showAnimations: boolean;
  turnTimerEnabled: boolean;
  turnTimerSeconds: number;
}

export const DEFAULT_SOCIAL_LUDO_SETTINGS: SocialLudoSettings = {
  showAnimations: true,
  turnTimerEnabled: false,
  turnTimerSeconds: 60,
};

const TURN_SECONDS_MIN = 15;
const TURN_SECONDS_MAX = 600;

export function parseSocialLudoSettings(raw: unknown): SocialLudoSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SOCIAL_LUDO_SETTINGS };
  const value = raw as Partial<SocialLudoSettings>;
  const turnTimerSeconds =
    typeof value.turnTimerSeconds === "number"
      ? Math.min(TURN_SECONDS_MAX, Math.max(TURN_SECONDS_MIN, Math.round(value.turnTimerSeconds)))
      : DEFAULT_SOCIAL_LUDO_SETTINGS.turnTimerSeconds;

  return {
    showAnimations: value.showAnimations !== false,
    turnTimerEnabled: Boolean(value.turnTimerEnabled),
    turnTimerSeconds,
  };
}

export function normalizeSocialLudoSettingsInput(
  input: Partial<SocialLudoSettings>,
): SocialLudoSettings {
  return parseSocialLudoSettings({ ...DEFAULT_SOCIAL_LUDO_SETTINGS, ...input });
}
