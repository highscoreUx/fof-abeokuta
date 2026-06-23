import { Prisma } from "@/generated/prisma/client";
import { COMMUNITY_STAFF_PROFILE_SLUGS } from "@/lib/community-audience";
import { CheckInEmailError, resolveEmailForCheckIn } from "@/lib/check-in-email";
import { invalidateSessionAuthContext } from "@/lib/auth/session";
import { isParticipantPermissions } from "@/lib/member-access";
import { ensurePlatformRolesSeeded } from "@/lib/platform-roles.server";
import { getProfileLabelForPermissions } from "@/lib/role-preset-cache";
import { prisma } from "@/lib/prisma";
import { serializeUserRow, userWithAccountInclude } from "@/lib/users";
import {
  hasEventPermissionOverride,
  permissionsForEventAccessProfile,
} from "@/lib/user-permissions";

export class EventUserAccessError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "EventUserAccessError";
  }
}

export async function updateEventUserAccess(input: {
  eventId: string;
  userId: string;
  permissionProfile: string;
  email?: string;
}) {
  await ensurePlatformRolesSeeded();
  const user = await prisma.user.findFirst({
    where: { id: input.userId, eventId: input.eventId },
    include: userWithAccountInclude,
  });
  if (!user) {
    throw new EventUserAccessError("User not found", "NOT_FOUND");
  }

  if (!user.account.email) {
    try {
      await resolveEmailForCheckIn(user.accountId, input.email);
    } catch (error) {
      if (error instanceof CheckInEmailError) {
        throw new EventUserAccessError(error.message, "EMAIL_REQUIRED");
      }
      throw error;
    }
  }

  if (input.permissionProfile === "participant") {
    if (!isParticipantPermissions(user.account.permissions)) {
      throw new EventUserAccessError(
        "This person has a global staff account and cannot be demoted here.",
        "GLOBAL_STAFF_ACCOUNT",
      );
    }

    const updated = await prisma.user.update({
      where: { id: input.userId },
      data: {
        permissions: Prisma.DbNull,
        authVersion: { increment: 1 },
      },
      include: userWithAccountInclude,
    });
    await invalidateSessionAuthContext(input.userId);
    return { user: serializeUserRow(updated) };
  }

  if (!isParticipantPermissions(user.account.permissions)) {
    throw new EventUserAccessError(
      "Only participants can be assigned event-scoped staff roles here.",
      "NOT_PARTICIPANT",
    );
  }

  const permissions = permissionsForEventAccessProfile(input.permissionProfile);
  if (!permissions) {
    throw new EventUserAccessError("Invalid role", "VALIDATION_ERROR");
  }

  if (!(COMMUNITY_STAFF_PROFILE_SLUGS as readonly string[]).includes(input.permissionProfile)) {
    throw new EventUserAccessError("Invalid staff role", "VALIDATION_ERROR");
  }

  const updated = await prisma.user.update({
    where: { id: input.userId },
    data: {
      permissions,
      authVersion: { increment: 1 },
    },
    include: userWithAccountInclude,
  });
  await invalidateSessionAuthContext(input.userId);

  return {
    user: serializeUserRow(updated),
    permissionProfile: getProfileLabelForPermissions(permissions),
    isEventScoped: hasEventPermissionOverride(updated),
  };
}
