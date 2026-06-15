export type ActivityBracketGameType = "tic_tac_toe" | "hangman";

export type ActivityCompetitionFormat = "SINGLE_MATCH" | "CHAMPIONSHIP";

export interface BracketTeamInfo {
  id: string;
  letter: string;
  name: string;
  color: string;
}

export interface BracketSlotSnapshot {
  slotId: string;
  teamA: BracketTeamInfo;
  teamB: BracketTeamInfo | null;
  teamAWins: number;
  teamBWins: number;
  targetWins: number;
  winnerTeamId: string | null;
  isBye: boolean;
  state: "PENDING" | "ACTIVE" | "COMPLETE";
  activeMatchId: string | null;
}

export interface BracketRoundSnapshot {
  roundNumber: number;
  state: "PENDING" | "ACTIVE" | "COMPLETE";
  slots: BracketSlotSnapshot[];
}

export interface ActivityBracketSnapshot {
  bracketId: string;
  challengeId: string;
  gameType: ActivityBracketGameType;
  state: "SETUP" | "ACTIVE" | "FINISHED";
  targetWins: number;
  currentRound: number;
  championTeam: BracketTeamInfo | null;
  rounds: BracketRoundSnapshot[];
  serverNow: number;
}

export interface BracketPairing {
  teamAId: string;
  teamBId: string | null;
  isBye: boolean;
}
