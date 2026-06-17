export type SocialGameMatchStatus = "WAITING" | "ACTIVE" | "FINISHED";

export interface SocialGamePlayerInfo {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  seat: string;
}

export interface SocialGameMatchSnapshot {
  matchId: string;
  sessionId: string;
  kind: string;
  status: SocialGameMatchStatus;
  state: unknown;
  players: SocialGamePlayerInfo[];
  currentTurnUserId: string | null;
  winnerUserId: string | null;
  myUserId: string | null;
  serverNow: number;
}

export interface SocialGameSessionMeta {
  settings: Record<string, unknown>;
}
