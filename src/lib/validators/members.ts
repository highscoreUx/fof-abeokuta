import { z } from "zod";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32)
  .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only");

export const createMemberSchema = z.object({
  email: z.string().email("Valid email is required"),
  username: usernameSchema,
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  permissionProfile: z.string().min(1, "Role is required"),
  password: z.string().min(12).optional(),
});

export const updateMemberSchema = z.object({
  email: z.string().email("Valid email is required").optional(),
  username: usernameSchema.optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  middleName: z.string().nullable().optional(),
  permissionProfile: z.string().min(1).optional(),
});
