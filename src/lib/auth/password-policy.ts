import { z } from "zod";

export const newPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[0-9]/, "Include a number");

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: newPasswordSchema,
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "Reset link is invalid"),
  newPassword: newPasswordSchema,
});
