import type { SocialLudoSettings } from "@/lib/chat-game-ludo-settings";

export interface SocialLudoSessionState {
  settings: SocialLudoSettings;
  turnDeadlineAt: number | null;
  turnUserId: string | null;
}
