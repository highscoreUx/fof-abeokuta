import { NextRequest, NextResponse } from "next/server";
import { updateAccount } from "@/lib/accounts";
import { jsonError } from "@/lib/auth/middleware";
import {
  isLockedMemberAccount,
  isPlatformAdminPermissions,
  PLATFORM_ADMIN_PROFILE_SLUG,
} from "@/lib/member-access";
import {
  permissionsForMemberProfile,
  validateMemberProfileAssignment,
} from "@/lib/member-profile-assignment";
import { getProfileLabelForPermissions } from "@/lib/permission-profiles";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";
import { serializeMemberRow } from "@/lib/users";
import { updateMemberSchema } from "@/lib/validators/members";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const existing = await prisma.account.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!existing) {
    return jsonError("Member not found", "NOT_FOUND", 404);
  }

  const body = await request.json();
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  if (
    parsed.data.permissionProfile &&
    isPlatformAdminPermissions(existing.permissions) &&
    parsed.data.permissionProfile !== PLATFORM_ADMIN_PROFILE_SLUG
  ) {
    return jsonError("Platform admin permission profile cannot be changed", "FORBIDDEN", 403);
  }

  if (parsed.data.permissionProfile) {
    const assignmentError = validateMemberProfileAssignment(
      authResult.auth.permissions,
      parsed.data.permissionProfile,
    );
    if (assignmentError) {
      return jsonError(assignmentError, "FORBIDDEN", 403);
    }
  }

  try {
    const account = await updateAccount(id, {
      email: parsed.data.email,
      username: parsed.data.username,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      middleName: parsed.data.middleName,
      permissions: parsed.data.permissionProfile
        ? permissionsForMemberProfile(parsed.data.permissionProfile)
        : undefined,
    });

    const refreshed =
      parsed.data.permissionProfile === PLATFORM_ADMIN_PROFILE_SLUG
        ? await prisma.account.update({
            where: { id: account.id },
            data: { globalMember: true },
            include: { _count: { select: { users: true } } },
          })
        : await prisma.account.findUniqueOrThrow({
            where: { id: account.id },
            include: { _count: { select: { users: true } } },
          });

    return NextResponse.json({
      member: serializeMemberRow(refreshed),
      permissionProfile: getProfileLabelForPermissions(refreshed.permissions),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to update member",
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
  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing) {
    return jsonError("Member not found", "NOT_FOUND", 404);
  }

  if (isLockedMemberAccount(existing.permissions)) {
    return jsonError("This member cannot be deleted", "FORBIDDEN", 403);
  }

  if (existing.id === authResult.auth.accountId) {
    return jsonError("You cannot delete your own account", "FORBIDDEN", 403);
  }

  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
