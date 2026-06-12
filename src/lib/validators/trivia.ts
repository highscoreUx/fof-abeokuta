import { z } from "zod";

export const triviaQuestionTypeSchema = z.enum([
  "QUIZ",
  "QUIZ_IMAGE",
  "TRUE_FALSE",
  "TYPE_ANSWER",
  "PUZZLE",
  "PUZZLE_IMAGE",
  "SLIDER",
  "PIN_ANSWER",
  "QUIZ_AUDIO",
]);

export const triviaQuestionSchema = z.object({
  type: triviaQuestionTypeSchema.default("QUIZ"),
  text: z.string().min(1),
  options: z.array(z.string().min(1)).max(6).default([]),
  correctIndex: z.number().int().min(0).default(0),
  config: z.record(z.string(), z.unknown()).default({}),
  mediaKey: z.string().optional().nullable(),
  mediaUrl: z.string().optional().nullable(),
  timeLimitSec: z.number().int().min(5).max(120).optional(),
});

export const triviaAnswerSchema = z.object({
  answerIndex: z.number().int().min(-1).optional(),
  text: z.string().optional(),
  order: z.array(z.number().int()).optional(),
  value: z.number().optional(),
  pins: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
});
