import { z } from "zod";

export const createEventUserRoleSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).optional(),
  permissions: z.array(z.string()).default([]),
  fullAccess: z.boolean().optional(),
});

export const updateEventUserRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.array(z.string()).optional(),
  fullAccess: z.boolean().optional(),
});
