export type SocialTttSeriesMode = "single" | "race";

export interface SocialTttSettings {
  seriesMode: SocialTttSeriesMode;
  /** Wins needed to take the series (race mode only). */
  raceTarget: number;
  turnTimerEnabled: boolean;
  /** Seconds per turn when timer is enabled. */
  turnTimerSeconds: number;
  /** When false, a full board with no winner starts a new round instead of ending. */
  endOnDraw: boolean;
}

export interface SocialTttScore {
  x: number;
  o: number;
}

export const DEFAULT_SOCIAL_TTT_SETTINGS: SocialTttSettings = {
  seriesMode: "single",
  raceTarget: 3,
  turnTimerEnabled: false,
  turnTimerSeconds: 30,
  endOnDraw: true,
};

const RACE_TARGET_MIN = 1;
const RACE_TARGET_MAX = 9;
const TURN_SECONDS_MIN = 5;
const TURN_SECONDS_MAX = 300;

export function parseSocialTttSettings(raw: unknown): SocialTttSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SOCIAL_TTT_SETTINGS };
  const value = raw as Partial<SocialTttSettings>;
  const raceTarget =
    typeof value.raceTarget === "number"
      ? Math.min(RACE_TARGET_MAX, Math.max(RACE_TARGET_MIN, Math.round(value.raceTarget)))
      : DEFAULT_SOCIAL_TTT_SETTINGS.raceTarget;
  const turnTimerSeconds =
    typeof value.turnTimerSeconds === "number"
      ? Math.min(TURN_SECONDS_MAX, Math.max(TURN_SECONDS_MIN, Math.round(value.turnTimerSeconds)))
      : DEFAULT_SOCIAL_TTT_SETTINGS.turnTimerSeconds;

  return {
    seriesMode: value.seriesMode === "race" ? "race" : "single",
    raceTarget,
    turnTimerEnabled: Boolean(value.turnTimerEnabled),
    turnTimerSeconds,
    endOnDraw: value.endOnDraw !== false,
  };
}

export function parseSocialTttScore(raw: unknown): SocialTttScore {
  if (!raw || typeof raw !== "object") return { x: 0, o: 0 };
  const value = raw as Partial<SocialTttScore>;
  return {
    x: typeof value.x === "number" ? Math.max(0, Math.round(value.x)) : 0,
    o: typeof value.o === "number" ? Math.max(0, Math.round(value.o)) : 0,
  };
}

export function normalizeSocialTttSettingsInput(
  input: Partial<SocialTttSettings>,
): SocialTttSettings {
  return parseSocialTttSettings({ ...DEFAULT_SOCIAL_TTT_SETTINGS, ...input });
}
