import type { TriviaAnswerPayload, TriviaQuestionConfig, TriviaQuestionRecord } from "@/lib/trivia/types";

function normalizeText(value: string, caseSensitive?: boolean) {
  const trimmed = value.trim();
  return caseSensitive ? trimmed : trimmed.toLowerCase();
}

export function scoreTriviaAnswer(
  question: TriviaQuestionRecord,
  payload: TriviaAnswerPayload,
): boolean {
  const config = question.config ?? {};

  switch (question.type) {
    case "QUIZ":
    case "TRUE_FALSE":
    case "QUIZ_AUDIO":
      return payload.answerIndex === question.correctIndex;

    case "TYPE_ANSWER": {
      const text = payload.text?.trim();
      if (!text) return false;
      const accepted = config.acceptedAnswers?.length
        ? config.acceptedAnswers
        : question.options;
      const normalized = normalizeText(text, config.caseSensitive);
      return accepted.some(
        (a) => normalizeText(a, config.caseSensitive) === normalized,
      );
    }

    case "PUZZLE": {
      const order = payload.order;
      const correct = config.correctOrder ?? [];
      if (!order || order.length !== correct.length) return false;
      return order.every((v, i) => v === correct[i]);
    }

    case "SLIDER": {
      const value = payload.value;
      if (value === undefined || value === null) return false;
      const correct = config.correct ?? question.correctIndex;
      const tolerance = config.tolerance ?? 0;
      return Math.abs(value - correct) <= tolerance;
    }

    case "PIN_ANSWER": {
      const pins = payload.pins;
      const targets = config.pins ?? [];
      const tolerance = config.pinTolerance ?? 0.08;
      if (!pins?.length || !targets.length) return false;
      return targets.every((target) =>
        pins.some(
          (pin) =>
            Math.hypot(pin.x - target.x, pin.y - target.y) <= tolerance,
        ),
      );
    }

    default:
      return false;
  }
}

export function parseQuestionConfig(raw: unknown): TriviaQuestionConfig {
  if (!raw || typeof raw !== "object") return {};
  return raw as TriviaQuestionConfig;
}

export function toTriviaQuestionRecord(q: {
  id: string;
  type: string;
  text: string;
  options: unknown;
  correctIndex: number;
  config: unknown;
  mediaKey?: string | null;
  mediaUrl?: string | null;
  timeLimitSec: number;
}): TriviaQuestionRecord {
  return {
    id: q.id,
    type: q.type as TriviaQuestionRecord["type"],
    text: q.text,
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
    correctIndex: q.correctIndex,
    config: parseQuestionConfig(q.config),
    mediaKey: q.mediaKey,
    mediaUrl: q.mediaUrl,
    timeLimitSec: q.timeLimitSec,
  };
}
