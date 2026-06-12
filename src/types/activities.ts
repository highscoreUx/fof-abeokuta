export interface KahootActivityDetail {
  kind: "kahoot";
  id: string;
  title: string;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  questions: Array<{
    id: string;
    text: string;
    options?: string[];
    correctIndex?: number;
    timeLimitSec?: number;
  }>;
}

export interface SpinActivityDetail {
  kind: "spin";
  id: string;
  title: string;
  allowGeneralParticipants: boolean;
  allowGroupParticipants: boolean;
  state: string;
}

export type ActivityDetail = KahootActivityDetail | SpinActivityDetail;

export type ActivityConfigureKind = ActivityDetail["kind"];
