export type SpinnerParticipationMode = "CONCURRENT" | "ONE_AT_A_TIME";

export interface SpinnerConfig {
  options: string[];
}

export interface SpinnerSpinRecord {
  id: string;
  userId: string;
  username: string;
  selectedIndex: number;
  selectedOption: string;
  createdAt: number;
}

export interface SpinnerStateSnapshot {
  sessionId: string;
  challengeId: string;
  title: string;
  options: string[];
  participationMode: SpinnerParticipationMode;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  teamId: string | null;
  teamLetter: string | null;
  state: "ACTIVE" | "COMPLETED";
  activeUserId: string | null;
  activeUsername: string | null;
  startedByUserId: string;
  lastSpin: SpinnerSpinRecord | null;
  spinHistory: SpinnerSpinRecord[];
  serverNow: number;
}
