import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/auth/middleware";
import { normalizeRolePermissions } from "@/lib/permissions/catalog";
import {
  createPlatformRole,
  listPlatformRoles,
  slugFromRoleName,
} from "@/lib/platform-roles.server";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(64),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only")
    .optional(),
  permissions: z.array(z.union([z.literal("*"), z.string()])).default([]),
});

export async function GET(request: NextRequest) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const roles = await listPlatformRoles();
  return NextResponse.json({ roles });
}

export async function POST(request: NextRequest) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  try {
    const role = await createPlatformRole({
      name: parsed.data.name,
      slug: parsed.data.slug ?? slugFromRoleName(parsed.data.name),
      permissions: normalizeRolePermissions(parsed.data.permissions),
    });
    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to create role",
      "CREATE_FAILED",
      400,
    );
  }
}
