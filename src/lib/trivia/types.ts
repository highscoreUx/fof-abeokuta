export type TriviaQuestionType =
  | "QUIZ"
  | "TRUE_FALSE"
  | "TYPE_ANSWER"
  | "PUZZLE"
  | "SLIDER"
  | "PIN_ANSWER"
  | "QUIZ_AUDIO";

export interface TriviaQuestionConfig {
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  items?: string[];
  correctOrder?: number[];
  min?: number;
  max?: number;
  correct?: number;
  tolerance?: number;
  pins?: Array<{ x: number; y: number }>;
  pinTolerance?: number;
}

export interface TriviaAnswerPayload {
  answerIndex?: number;
  text?: string;
  order?: number[];
  value?: number;
  pins?: Array<{ x: number; y: number }>;
}

export interface TriviaQuestionRecord {
  id: string;
  type: TriviaQuestionType;
  text: string;
  options: string[];
  correctIndex: number;
  config: TriviaQuestionConfig;
  mediaKey?: string | null;
  mediaUrl?: string | null;
  timeLimitSec: number;
}

export const TRIVIA_TYPE_LABELS: Record<TriviaQuestionType, string> = {
  QUIZ: "Multiple choice",
  TRUE_FALSE: "True or false",
  TYPE_ANSWER: "Type answer",
  PUZZLE: "Puzzle (order)",
  SLIDER: "Slider",
  PIN_ANSWER: "Pin on image",
  QUIZ_AUDIO: "Audio quiz",
};
