import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/auth/middleware";
import { normalizeRolePermissions } from "@/lib/permissions/catalog";
import {
  deletePlatformRole,
  serializePlatformRole,
  updatePlatformRole,
} from "@/lib/platform-roles.server";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  permissions: z.array(z.union([z.literal("*"), z.string()])).optional(),
  applyToExisting: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  try {
    const result = await updatePlatformRole(id, {
      name: parsed.data.name,
      permissions:
        parsed.data.permissions !== undefined
          ? normalizeRolePermissions(parsed.data.permissions)
          : undefined,
      applyToExisting: parsed.data.applyToExisting,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to update role",
      "UPDATE_FAILED",
      400,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    await deletePlatformRole(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to delete role",
      "DELETE_FAILED",
      400,
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const role = await prisma.platformRole.findUnique({ where: { id } });
  if (!role) {
    return jsonError("Role not found", "NOT_FOUND", 404);
  }

  return NextResponse.json({ role: serializePlatformRole(role) });
}
