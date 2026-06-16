import type { SocialHangmanScore, SocialHangmanSettings } from "@/lib/chat-game-hangman-settings";

export interface SocialHangmanSessionState {
  settings: SocialHangmanSettings;
  score: SocialHangmanScore;
  turnDeadlineAt: number | null;
  turnUserId: string | null;
  currentTopicId: string | null;
}
