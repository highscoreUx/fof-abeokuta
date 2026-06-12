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

export type ActivityDetail = KahootActivityDetail | SpinnerActivityDetail | SurveyActivityDetail;

export type ActivityConfigureKind = ActivityDetail["kind"];
