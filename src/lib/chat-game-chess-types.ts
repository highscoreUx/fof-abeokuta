import type { SocialChessSettings } from "@/lib/chat-game-chess-settings";

export interface SocialChessSessionState {
  settings: SocialChessSettings;
  turnDeadlineAt: number | null;
  turnUserId: string | null;
}
