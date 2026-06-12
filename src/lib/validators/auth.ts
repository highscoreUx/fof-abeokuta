import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Username is required")
    .max(80)
    .regex(/^[a-z0-9]+(\.[a-z0-9]+)+$/, "Use your assigned username (e.g. ada.wireframe)"),
  password: z.string().regex(/^\d{4}$/, "Password must be exactly 4 digits"),
});

export const createUserSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    middleName: z.string().optional(),
    eventUserRoleId: z.string().optional(),
    role: z.enum(["ADMIN", "STAFF", "JUDGE", "PARTICIPANT"]).optional(),
    password: z.string().regex(/^\d{4}$/, "Password must be exactly 4 digits").optional(),
  })
  .refine((data) => Boolean(data.eventUserRoleId || data.role), {
    message: "Access profile is required",
    path: ["eventUserRoleId"],
  });

export const userImportRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  role: z.enum(["ADMIN", "STAFF", "JUDGE", "PARTICIPANT"]),
  password: z.string().regex(/^\d{4}$/).optional(),
  pin: z.string().regex(/^\d{4}$/).optional(),
});

export const agendaItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  sortOrder: z.number().int().optional(),
  visible: z.boolean().optional(),
});

export const scoreSchema = z.object({
  teamId: z.string(),
  criterionId: z.string(),
  points: z.number().int().min(0),
});

export const quizQuestionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correctIndex: z.number().int().min(0),
  timeLimitSec: z.number().int().min(5).max(120).optional(),
});

export const voteConfigSchema = z.object({
  options: z.array(z.string().min(1)).min(2),
  maxVotes: z.number().int().min(1).default(1),
  anonymous: z.boolean().default(false),
});
