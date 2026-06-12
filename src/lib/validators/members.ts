import { z } from "zod";
import { PERMISSION_PROFILES } from "@/lib/permission-profiles";
import { PLATFORM_ADMIN_PROFILE_SLUG } from "@/lib/member-access";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32)
  .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only");

const creatableProfileSlugs = PERMISSION_PROFILES.map((profile) => profile.slug) as [
  string,
  ...string[],
];

const editableProfileSlugs = [...creatableProfileSlugs, PLATFORM_ADMIN_PROFILE_SLUG] as [
  string,
  ...string[],
];

export const createMemberSchema = z.object({
  email: z.string().email("Valid email is required"),
  username: usernameSchema,
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  permissionProfile: z.enum(creatableProfileSlugs),
  password: z.string().min(12).optional(),
});

export const updateMemberSchema = z.object({
  email: z.string().email("Valid email is required").optional(),
  username: usernameSchema.optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  middleName: z.string().nullable().optional(),
  permissionProfile: z.enum(editableProfileSlugs).optional(),
});
