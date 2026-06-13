import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isTeamAssignableMember } from "@/lib/account-permissions";
import { serializeCheckInUser } from "@/lib/check-in";
import { CheckInEmailError, resolveEmailForCheckIn } from "@/lib/check-in-email";
import { jsonError } from "@/lib/auth/middleware";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { pickUserProfile, userWithAccountInclude } from "@/lib/user-display";
import { prisma } from "@/lib/prisma";
import { assignTeams } from "@/lib/team-assign";
import { isTeamingEnabled } from "@/lib/team-settings";
import { getIO } from "@/server/socket/io";
import { emitCheckInUpdate } from "@/server/socket/handlers";
import { broadcastCheckInAnnouncement } from "@/lib/check-in-chat-broadcast";

const checkInBodySchema = z.object({
  email: z.string().email().optional(),
});

async function getEventUser(eventId: string, userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, eventId },
    include: userWithAccountInclude,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id: eventId, userId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return jsonError("Event not found", "NOT_FOUND", 404);

  const user = await getEventUser(event.id, userId);
  if (!user) return jsonError("User not found", "NOT_FOUND", 404);

  if (user.checkedInAt) {
    return NextResponse.json({
      user: serializeCheckInUser(user),
      alreadyCheckedIn: true,
    });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = checkInBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  try {
    await resolveEmailForCheckIn(user.accountId, parsed.data.email);
  } catch (error) {
    if (error instanceof CheckInEmailError) {
      return jsonError(error.message, "EMAIL_REQUIRED", 400);
    }
    throw error;
  }

  let updated = await prisma.user.update({
    where: { id: userId },
    data: { checkedInAt: new Date(), checkedInBy: null },
    include: userWithAccountInclude,
  });

  if (
    (await isTeamingEnabled(event.id)) &&
    !updated.teamId &&
    isTeamAssignableMember(updated.account.permissions as never, false)
  ) {
    await assignTeams(event.id, { userIds: [updated.id], onlyUnassigned: true });
    updated = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: userWithAccountInclude,
    });
  }

  const profile = pickUserProfile(updated);

  try {
    await emitCheckInUpdate(getIO(), event.slug, { ...updated, ...profile });
    await broadcastCheckInAnnouncement(event.slug, { ...updated, ...profile }, event.id);
  } catch {
    // socket optional
  }

  return NextResponse.json({ user: serializeCheckInUser(updated) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id: eventId, userId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return jsonError("Event not found", "NOT_FOUND", 404);

  const user = await getEventUser(event.id, userId);
  if (!user) return jsonError("User not found", "NOT_FOUND", 404);

  if (!user.checkedInAt) {
    return NextResponse.json({
      user: serializeCheckInUser(user),
      alreadyUnchecked: true,
    });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { checkedInAt: null, checkedInBy: null },
    include: userWithAccountInclude,
  });

  const profile = pickUserProfile(updated);

  try {
    await emitCheckInUpdate(getIO(), event.slug, { ...updated, ...profile });
  } catch {
    // socket optional
  }

  return NextResponse.json({ user: serializeCheckInUser(updated) });
}
