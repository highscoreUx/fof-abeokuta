import type { SocialTttScore, SocialTttSettings } from "@/lib/chat-game-ttt-settings";

export interface SocialTttSessionState {
  settings: SocialTttSettings;
  score: SocialTttScore;
  turnDeadlineAt: number | null;
  /** User id whose turn it is (live social matches). */
  turnUserId: string | null;
}
