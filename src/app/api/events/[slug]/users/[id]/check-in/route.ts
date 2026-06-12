import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { isTeamAssignableMember } from "@/lib/account-permissions";
import { serializeCheckInUser } from "@/lib/check-in";
import { pickUserProfile, userWithAccountInclude } from "@/lib/user-display";
import { broadcastCheckInAnnouncement } from "@/lib/check-in-chat-broadcast";
import { prisma } from "@/lib/prisma";
import { assignTeams } from "@/lib/team-assign";
import { getIO } from "@/server/socket/io";
import { emitCheckInUpdate } from "@/server/socket/handlers";
import { jsonError } from "@/lib/auth/middleware";

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

  let updated = await prisma.user.update({
    where: { id },
    data: { checkedInAt: new Date(), checkedInBy: ctx.auth.userId },
    include: userWithAccountInclude,
  });

  if (!updated.teamId && isTeamAssignableMember(updated.account.permissions as never, false)) {
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
