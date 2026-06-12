export type SurveyQuestionType =
  | "POLL"
  | "WORD_CLOUD"
  | "BRAINSTORM"
  | "DROP_PIN"
  | "OPEN_ENDED"
  | "SCALE"
  | "NPS";

export interface SurveyQuestionConfig {
  options?: string[];
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  placeholder?: string;
}

export interface SurveyAnswerValue {
  optionIndex?: number;
  text?: string;
  value?: number;
  pins?: Array<{ x: number; y: number }>;
}

export const SURVEY_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  POLL: "Poll",
  WORD_CLOUD: "Word cloud",
  BRAINSTORM: "Brainstorm",
  DROP_PIN: "Drop pin",
  OPEN_ENDED: "Open-ended",
  SCALE: "Scale",
  NPS: "NPS",
};

export function parseSurveyConfig(raw: unknown): SurveyQuestionConfig {
  if (!raw || typeof raw !== "object") return {};
  return raw as SurveyQuestionConfig;
}

export function isSurveyOpen(survey: {
  status: string;
  opensAt: Date | string | null;
  closesAt: Date | string | null;
}): boolean {
  if (survey.status !== "OPEN") return false;
  const now = Date.now();
  if (survey.opensAt && new Date(survey.opensAt).getTime() > now) return false;
  if (survey.closesAt && new Date(survey.closesAt).getTime() < now) return false;
  return true;
}

export function canEditSurveyResponse(survey: {
  status: string;
  closesAt: Date | string | null;
  allowEditsUntilClose: boolean;
}): boolean {
  if (survey.status !== "OPEN") return false;
  if (!survey.allowEditsUntilClose) return false;
  if (survey.closesAt && new Date(survey.closesAt).getTime() < Date.now()) return false;
  return true;
}
