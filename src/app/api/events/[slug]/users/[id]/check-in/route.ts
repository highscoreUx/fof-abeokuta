import { NextRequest, NextResponse } from "next/server";
import { requireEventRole } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { assignTeamsBalanced } from "@/lib/users";
import { getIO } from "@/server/socket/io";
import { emitCheckInUpdate } from "@/server/socket/handlers";
import { jsonError } from "@/lib/auth/middleware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventRole(request, slug, "STAFF");
  if (ctx instanceof NextResponse) return ctx;

  const user = await prisma.user.findFirst({
    where: { id, eventId: ctx.event.id },
    include: { team: true },
  });

  if (!user) return jsonError("User not found", "NOT_FOUND", 404);

  if (user.checkedInAt) {
    return NextResponse.json({
      user: { id: user.id, checkedInAt: user.checkedInAt, teamLetter: user.team?.letter ?? null },
      alreadyCheckedIn: true,
    });
  }

  let updated = await prisma.user.update({
    where: { id },
    data: { checkedInAt: new Date(), checkedInBy: ctx.auth.userId },
    include: { team: true },
  });

  if (!updated.teamId && updated.role === "PARTICIPANT") {
    await assignTeamsBalanced(ctx.event.id, [updated.id]);
    updated = await prisma.user.findUniqueOrThrow({ where: { id }, include: { team: true } });
  }

  try {
    await emitCheckInUpdate(getIO(), slug, updated);
  } catch {
    // socket optional
  }

  return NextResponse.json({
    user: {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      username: updated.username,
      teamLetter: updated.team?.letter ?? null,
      checkedInAt: updated.checkedInAt,
    },
  });
}
