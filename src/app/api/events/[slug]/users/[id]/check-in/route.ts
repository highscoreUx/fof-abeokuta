import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { isTeamAssignableMember } from "@/lib/account-permissions";
import { serializeCheckInUser } from "@/lib/check-in";
import { CheckInEmailError, resolveEmailForCheckIn } from "@/lib/check-in-email";
import { pickUserProfile, userWithAccountInclude } from "@/lib/user-display";
import { broadcastCheckInAnnouncement } from "@/lib/check-in-chat-broadcast";
import { enqueueCheckInWelcomeEmail } from "@/server/queue/publish";
import { prisma } from "@/lib/prisma";
import { assignTeams } from "@/lib/team-assign";
import { isTeamingEnabled } from "@/lib/team-settings";
import { getIO } from "@/server/socket/io";
import { emitCheckInUpdate } from "@/server/socket/handlers";
import { jsonError } from "@/lib/auth/middleware";

const checkInBodySchema = z.object({
  email: z.string().email().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "user.check_in");
  if (ctx instanceof NextResponse) return ctx;

  const user = await prisma.user.findFirst({
    where: { id, eventId: ctx.event.id },
    include: userWithAccountInclude,
  });

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
    where: { id },
    data: { checkedInAt: new Date(), checkedInBy: ctx.auth.userId },
    include: userWithAccountInclude,
  });

  if (
    (await isTeamingEnabled(ctx.event.id)) &&
    !updated.teamId &&
    isTeamAssignableMember(updated.account.permissions as never, false)
  ) {
    await assignTeams(ctx.event.id, { userIds: [updated.id], onlyUnassigned: true });
    updated = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: userWithAccountInclude,
    });
  }

  const profile = pickUserProfile(updated);

  try {
    await emitCheckInUpdate(getIO(), slug, { ...updated, ...profile });
    await broadcastCheckInAnnouncement(slug, { ...updated, ...profile }, ctx.event.id);
  } catch {
    // socket optional
  }

  enqueueCheckInWelcomeEmail({ userId: updated.id, eventId: ctx.event.id });

  return NextResponse.json({
    user: serializeCheckInUser(updated),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "user.check_in");
  if (ctx instanceof NextResponse) return ctx;

  const user = await prisma.user.findFirst({
    where: { id, eventId: ctx.event.id },
    include: userWithAccountInclude,
  });

  if (!user) return jsonError("User not found", "NOT_FOUND", 404);

  if (!user.checkedInAt) {
    return NextResponse.json({
      user: serializeCheckInUser(user),
      alreadyUnchecked: true,
    });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { checkedInAt: null, checkedInBy: null },
    include: userWithAccountInclude,
  });

  const profile = pickUserProfile(updated);

  try {
    await emitCheckInUpdate(getIO(), slug, { ...updated, ...profile });
  } catch {
    // socket optional
  }

  return NextResponse.json({
    user: serializeCheckInUser(updated),
  });
}
