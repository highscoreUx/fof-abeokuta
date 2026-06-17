import type { ChatGameKind } from "@/lib/activities/manifest";

/** Social games stored in SocialGameMatch JSON state (not legacy match tables). */
export const SOCIAL_JSON_GAME_KINDS = [
  "chess",
  "ludo",
  "whot",
  "sudoku",
] as const satisfies readonly ChatGameKind[];

export type SocialJsonGameKind = (typeof SOCIAL_JSON_GAME_KINDS)[number];

export function isSocialJsonGameKind(kind: string): kind is SocialJsonGameKind {
  return (SOCIAL_JSON_GAME_KINDS as readonly string[]).includes(kind);
}

export const SOCIAL_JSON_GAME_LABELS: Record<SocialJsonGameKind, string> = {
  chess: "Chess",
  ludo: "Ludo",
  whot: "Whot",
  sudoku: "Sudoku",
};
