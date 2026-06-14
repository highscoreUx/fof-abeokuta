import { z } from "zod";
import { PERMISSION_PROFILES } from "@/lib/permission-profiles";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32)
  .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only");

const profileSlugs = PERMISSION_PROFILES.map((p) => p.slug) as [string, ...string[]];

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const createUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  username: usernameSchema.optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  permissionProfile: z.enum(profileSlugs).optional(),
  role: z.enum(["ADMIN", "STAFF", "JUDGE", "PARTICIPANT"]).optional(),
  password: z.string().min(12).optional(),
});

export const userImportRowSchema = z.object({
  email: z.string().email(),
  username: usernameSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  permissionProfile: z.enum(profileSlugs).optional(),
  role: z.enum(["ADMIN", "STAFF", "JUDGE", "PARTICIPANT"]).optional(),
  password: z.string().min(12).optional(),
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
