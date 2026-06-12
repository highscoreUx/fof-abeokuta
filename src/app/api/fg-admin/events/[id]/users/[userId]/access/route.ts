import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { jsonError } from "@/lib/auth/middleware";
import { invalidateSessionAuthContext } from "@/lib/auth/session";
import {
  COMMUNITY_STAFF_PROFILE_SLUGS,
  EVENT_SCOPED_STAFF_PROFILE_SLUGS,
} from "@/lib/community-audience";
import { isParticipantPermissions } from "@/lib/member-access";
import { getProfileLabelForPermissions } from "@/lib/permission-profiles";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { CheckInEmailError, resolveEmailForCheckIn } from "@/lib/check-in-email";
import { prisma } from "@/lib/prisma";
import { serializeUserRow, userWithAccountInclude } from "@/lib/users";
import {
  hasEventPermissionOverride,
  permissionsForEventAccessProfile,
} from "@/lib/user-permissions";

const assignableSlugs = [...EVENT_SCOPED_STAFF_PROFILE_SLUGS, "participant"] as const;

const updateAccessSchema = z.object({
  permissionProfile: z.enum(assignableSlugs),
  email: z.string().email().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id: eventId, userId } = await params;
  const body = await request.json();
  const parsed = updateAccessSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, eventId },
    include: userWithAccountInclude,
  });
  if (!user) return jsonError("User not found", "NOT_FOUND", 404);

  const { permissionProfile, email } = parsed.data;

  if (!user.account.email) {
    try {
      await resolveEmailForCheckIn(user.accountId, email);
    } catch (error) {
      if (error instanceof CheckInEmailError) {
        return jsonError(error.message, "EMAIL_REQUIRED", 400);
      }
      throw error;
    }
  }

  if (permissionProfile === "participant") {
    if (!isParticipantPermissions(user.account.permissions)) {
      return jsonError(
        "This person has a global staff account. Change their role on the Staff tab or in Members.",
        "GLOBAL_STAFF_ACCOUNT",
        400,
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        permissions: Prisma.DbNull,
        authVersion: { increment: 1 },
      },
      include: userWithAccountInclude,
    });
    await invalidateSessionAuthContext(userId);
    return NextResponse.json({ user: serializeUserRow(updated) });
  }

  if (!isParticipantPermissions(user.account.permissions)) {
    return jsonError(
      "Only participants can be assigned event-scoped staff roles here.",
      "NOT_PARTICIPANT",
      400,
    );
  }

  const permissions = permissionsForEventAccessProfile(permissionProfile);
  if (!permissions) {
    return jsonError("Invalid role", "VALIDATION_ERROR", 400);
  }

  if (!(COMMUNITY_STAFF_PROFILE_SLUGS as readonly string[]).includes(permissionProfile)) {
    return jsonError("Invalid staff role", "VALIDATION_ERROR", 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      permissions,
      authVersion: { increment: 1 },
    },
    include: userWithAccountInclude,
  });
  await invalidateSessionAuthContext(userId);

  return NextResponse.json({
    user: serializeUserRow(updated),
    permissionProfile: getProfileLabelForPermissions(permissions),
    isEventScoped: hasEventPermissionOverride(updated),
  });
}
