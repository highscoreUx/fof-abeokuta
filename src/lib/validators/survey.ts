import { z } from "zod";

export const surveyQuestionTypeSchema = z.enum([
  "POLL",
  "WORD_CLOUD",
  "BRAINSTORM",
  "DROP_PIN",
  "OPEN_ENDED",
  "SCALE",
  "NPS",
]);

export const surveyQuestionSchema = z.object({
  type: surveyQuestionTypeSchema,
  text: z.string().min(1),
  config: z.record(z.string(), z.unknown()).default({}),
  mediaKey: z.string().optional().nullable(),
  mediaUrl: z.string().optional().nullable(),
  required: z.boolean().optional(),
});

export const surveyAnswerValueSchema = z.object({
  optionIndex: z.number().int().min(0).optional(),
  text: z.string().optional(),
  value: z.number().optional(),
  pins: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
});

export const surveySubmitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      value: surveyAnswerValueSchema,
    }),
  ),
});
