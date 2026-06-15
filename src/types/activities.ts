import type { TriviaQuestionType } from "@/types";
import type { SurveyQuestionType } from "@/lib/survey/types";

export interface KahootActivityDetail {
  kind: "kahoot";
  id: string;
  title: string;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  questions: Array<{
    id: string;
    type?: TriviaQuestionType;
    text: string;
    options?: string[];
    correctIndex?: number;
    config?: Record<string, unknown>;
    mediaUrl?: string | null;
    timeLimitSec?: number;
  }>;
}

export interface SpinnerActivityDetail {
  kind: "spinner";
  id: string;
  title: string;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  participationMode?: "CONCURRENT" | "ONE_AT_A_TIME";
  optionsCount?: number;
  activeSessionId?: string | null;
}

/** @deprecated use SpinnerActivityDetail */
export type SpinActivityDetail = SpinnerActivityDetail;

export interface TicTacToeActivityDetail {
  kind: "tic_tac_toe";
  id: string;
  title: string;
  mode: "CHAMPION" | "COUNCIL";
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  activeMatchId?: string | null;
  activeMatchState?: string | null;
  matchCount?: number;
}

export interface SurveyActivityDetail {
  kind: "survey";
  id: string;
  title: string;
  status: string;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  opensAt: string | null;
  closesAt: string | null;
  allowEditsUntilClose: boolean;
  questions: Array<{
    id: string;
    type: SurveyQuestionType;
    text: string;
    config?: Record<string, unknown>;
    mediaUrl?: string | null;
    required?: boolean;
  }>;
  responseCount?: number;
}

export interface CountdownActivityDetail {
  kind: "countdown";
  id: string;
  title: string;
  durationSec: number;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  activeSessionId?: string | null;
  activeSessionState?: "RUNNING" | "PAUSED" | "FINISHED" | null;
}

export interface HangmanActivityDetail {
  kind: "hangman";
  id: string;
  title: string;
  mode: "CHAMPION" | "COUNCIL";
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  wordCount?: number;
  activeMatchId?: string | null;
  activeMatchState?: string | null;
}

export type ActivityDetail =
  | KahootActivityDetail
  | SpinnerActivityDetail
  | TicTacToeActivityDetail
  | SurveyActivityDetail
  | CountdownActivityDetail
  | HangmanActivityDetail;

/** Lightweight rows for the activities admin index (no nested question payloads). */
export type KahootActivityListItem = Omit<KahootActivityDetail, "questions"> & {
  questionCount: number;
};

export type SurveyActivityListItem = Omit<SurveyActivityDetail, "questions"> & {
  questionCount: number;
};

export type ActivityListItem =
  | KahootActivityListItem
  | SpinnerActivityDetail
  | TicTacToeActivityDetail
  | SurveyActivityListItem
  | CountdownActivityDetail
  | HangmanActivityDetail;

export interface EventActivityConfigRow {
  slug: string;
  name: string;
  enabled: boolean;
  allowGeneral: boolean;
  allowGroup: boolean;
}

export interface ActivityInstancesPayload {
  activities: EventActivityConfigRow[];
  instances: ActivityListItem[];
  anyEnabled: boolean;
}

export type ActivityConfigureKind = ActivityDetail["kind"];
