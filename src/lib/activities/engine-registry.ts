import { getActivityManifestEntry, type ActivitySlug } from "@/lib/activities/manifest";

/** Maps activity slugs to server engine modules (runtime code, not JSON). */
export const ACTIVITY_ENGINE_IDS = {
  quiz: "quiz",
  spinner: "spinner",
  survey: "survey",
  tic_tac_toe: "tic_tac_toe",
  countdown: "countdown",
  hangman: "hangman",
} as const;

export type ActivityEngineId = (typeof ACTIVITY_ENGINE_IDS)[keyof typeof ACTIVITY_ENGINE_IDS];

export function getActivityEngineId(slug: ActivitySlug | string): ActivityEngineId | undefined {
  const engine = getActivityManifestEntry(slug)?.engine;
  if (!engine) return undefined;
  return engine in ACTIVITY_ENGINE_IDS
    ? (engine as ActivityEngineId)
    : (engine as ActivityEngineId);
}

/** Slugs that support championship brackets (official activities only). */
export const BRACKET_ACTIVITY_SLUGS = ["tic_tac_toe", "hangman"] as const;

export type BracketActivitySlug = (typeof BRACKET_ACTIVITY_SLUGS)[number];

export function isBracketActivitySlug(slug: string): slug is BracketActivitySlug {
  return (BRACKET_ACTIVITY_SLUGS as readonly string[]).includes(slug);
}
