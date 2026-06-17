import type { SocialWhotSettings } from "@/lib/chat-game-whot-settings";

export interface SocialWhotSessionState {
  settings: SocialWhotSettings;
  turnDeadlineAt: number | null;
  turnUserId: string | null;
}
