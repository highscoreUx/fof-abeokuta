import type { TriviaQuestionType } from "@/lib/trivia/types";
import type { QuestionDraft } from "@/lib/quiz-question-form";
import { emptyQuestionDraft } from "@/lib/quiz-question-form";
import { filterValidMediaUrls, isMediaUrl } from "@/lib/trivia/media";

export interface TriviaQuestionFormState {
  draft: QuestionDraft;
  config: Record<string, unknown>;
}

export function defaultFormStateForType(type: TriviaQuestionType): TriviaQuestionFormState {
  const base = emptyQuestionDraft();

  switch (type) {
    case "TRUE_FALSE":
      return {
        draft: { ...base, options: ["True", "False"], correctIndex: 0 },
        config: {},
      };
    case "TYPE_ANSWER":
      return {
        draft: { ...base, options: ["", ""], correctIndex: 0 },
        config: { caseSensitive: false },
      };
    case "PUZZLE":
    case "PUZZLE_IMAGE":
      return {
        draft: { ...base, options: ["", "", ""], correctIndex: 0 },
        config: {},
      };
    case "QUIZ_IMAGE":
      return {
        draft: { ...base, options: ["", "", "", ""] },
        config: {},
      };
    case "SLIDER":
      return {
        draft: { ...base, options: [], correctIndex: 0 },
        config: { min: 0, max: 100, correct: 50, tolerance: 2 },
      };
    case "PIN_ANSWER":
      return {
        draft: { ...base, options: [], correctIndex: 0 },
        config: { pins: [{ x: 0.5, y: 0.5 }], pinTolerance: 0.08 },
      };
    case "QUIZ_AUDIO":
    case "QUIZ":
    default:
      return {
        draft: { ...base, options: ["", "", "", ""] },
        config: {},
      };
  }
}

export function validateTriviaQuestionForm(
  type: TriviaQuestionType,
  draft: QuestionDraft,
  config: Record<string, unknown>,
  mediaUrl?: string | null,
): string | null {
  if (!draft.text.trim()) return "Question text is required.";

  switch (type) {
    case "QUIZ":
    case "QUIZ_AUDIO": {
      const options = draft.options.map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) return "Add at least two answer options.";
      if (draft.correctIndex >= options.length) {
        return "Correct answer must match one of the options.";
      }
      if (type === "QUIZ_AUDIO" && !mediaUrl) {
        return "Provide an audio URL or upload a file for this question.";
      }
      return null;
    }
    case "QUIZ_IMAGE": {
      const options = filterValidMediaUrls(draft.options);
      if (options.length < 2) return "Add at least two image answers (URL or upload).";
      if (draft.correctIndex >= options.length) {
        return "Select the correct image answer.";
      }
      return null;
    }
    case "TRUE_FALSE":
      if (draft.correctIndex < 0 || draft.correctIndex > 1) {
        return "Select True or False as the correct answer.";
      }
      return null;
    case "TYPE_ANSWER": {
      const accepted = draft.options.map((o) => o.trim()).filter(Boolean);
      if (accepted.length < 1) return "Add at least one accepted answer.";
      return null;
    }
    case "PUZZLE": {
      const items = draft.options.map((o) => o.trim()).filter(Boolean);
      if (items.length < 2) return "Add at least two items to order.";
      return null;
    }
    case "PUZZLE_IMAGE": {
      const items = filterValidMediaUrls(draft.options);
      if (items.length < 2) return "Add at least two images to order (URL or upload).";
      return null;
    }
    case "SLIDER": {
      const min = Number(config.min ?? 0);
      const max = Number(config.max ?? 100);
      const correct = Number(config.correct);
      if (Number.isNaN(correct)) return "Enter the correct value.";
      if (min >= max) return "Max must be greater than min.";
      if (correct < min || correct > max) return "Correct value must be within min and max.";
      return null;
    }
    case "PIN_ANSWER":
      if (!mediaUrl || !isMediaUrl(mediaUrl)) {
        return "Provide an image URL or upload a file for players to pin.";
      }
      if (!Array.isArray(config.pins) || !(config.pins as unknown[]).length) {
        return "Set the correct pin location on the image.";
      }
      return null;
    default:
      return null;
  }
}

export function buildTriviaQuestionPayload(
  type: TriviaQuestionType,
  draft: QuestionDraft,
  config: Record<string, unknown>,
  mediaUrl?: string | null,
) {
  const text = draft.text.trim();
  const timeLimitSec = draft.timeLimitSec;

  switch (type) {
    case "QUIZ":
    case "QUIZ_AUDIO":
      return {
        type,
        text,
        options: draft.options.map((o) => o.trim()).filter(Boolean),
        correctIndex: draft.correctIndex,
        config: {},
        mediaUrl: type === "QUIZ_AUDIO" ? mediaUrl?.trim() || null : null,
        timeLimitSec,
      };
    case "QUIZ_IMAGE": {
      const options = filterValidMediaUrls(draft.options);
      return {
        type,
        text,
        options,
        correctIndex: draft.correctIndex,
        config: {},
        mediaUrl: mediaUrl?.trim() || null,
        timeLimitSec,
      };
    }
    case "TRUE_FALSE":
      return {
        type,
        text,
        options: ["True", "False"],
        correctIndex: draft.correctIndex,
        config: {},
        mediaUrl: null,
        timeLimitSec,
      };
    case "TYPE_ANSWER": {
      const acceptedAnswers = draft.options.map((o) => o.trim()).filter(Boolean);
      return {
        type,
        text,
        options: acceptedAnswers,
        correctIndex: 0,
        config: { acceptedAnswers, caseSensitive: Boolean(config.caseSensitive) },
        mediaUrl: null,
        timeLimitSec,
      };
    }
    case "PUZZLE": {
      const items = draft.options.map((o) => o.trim()).filter(Boolean);
      return {
        type,
        text,
        options: items,
        correctIndex: 0,
        config: { items, correctOrder: items.map((_, i) => i) },
        mediaUrl: null,
        timeLimitSec,
      };
    }
    case "PUZZLE_IMAGE": {
      const items = filterValidMediaUrls(draft.options);
      return {
        type,
        text,
        options: items,
        correctIndex: 0,
        config: { items, correctOrder: items.map((_, i) => i) },
        mediaUrl: mediaUrl?.trim() || null,
        timeLimitSec,
      };
    }
    case "SLIDER":
      return {
        type,
        text,
        options: [],
        correctIndex: 0,
        config: {
          min: Number(config.min ?? 0),
          max: Number(config.max ?? 100),
          correct: Number(config.correct),
          tolerance: Number(config.tolerance ?? 2),
        },
        mediaUrl: null,
        timeLimitSec,
      };
    case "PIN_ANSWER":
      return {
        type,
        text,
        options: [],
        correctIndex: 0,
        config: {
          pins: config.pins,
          pinTolerance: Number(config.pinTolerance ?? 0.08),
        },
        mediaUrl: mediaUrl?.trim() || null,
        timeLimitSec,
      };
    default:
      return {
        type: "QUIZ" as const,
        text,
        options: [],
        correctIndex: 0,
        config: {},
        mediaUrl: null,
        timeLimitSec,
      };
  }
}
