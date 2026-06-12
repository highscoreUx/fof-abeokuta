import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import { ACTIVITY_TIC_TAC_TOE, validateInstanceScopeAgainstEvent } from "@/lib/activities/catalog";
import {
  getEventActivityBySlug,
  isActivityEnabledForEvent,
} from "@/lib/activities/event-activities";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_TIC_TAC_TOE);
  const canAccess =
    hasPermission(ctx.auth.permissions, "tic_tac_toe.manage") ||
    hasPermission(ctx.auth.permissions, "tic_tac_toe.run");
  if (!enabled && !canAccess) {
    return jsonError("Activity not found", "NOT_FOUND", 404);
  }

  const challenge = await prisma.ticTacToeChallenge.findFirst({
    where: { id, eventId: ctx.event.id },
    include: {
      matches: {
        include: { teamX: true, teamO: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!challenge) return jsonError("Activity not found", "NOT_FOUND", 404);

  return NextResponse.json({ challenge });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "tic_tac_toe.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_TIC_TAC_TOE);
  if (!enabled) {
    return jsonError("Team Tic-Tac-Toe is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const challenge = await prisma.ticTacToeChallenge.findFirst({
    where: { id, eventId: ctx.event.id },
  });
  if (!challenge) return jsonError("Activity not found", "NOT_FOUND", 404);

  const eventActivity = await getEventActivityBySlug(ctx.event.id, ACTIVITY_TIC_TAC_TOE);
  if (!eventActivity) {
    return jsonError("Activity configuration missing.", "ACTIVITY_NOT_FOUND", 404);
  }

  const body = await request.json();

  const scope = {
    allowGeneralParticipants:
      body.allowGeneralParticipants !== undefined
        ? Boolean(body.allowGeneralParticipants)
        : challenge.allowGeneralParticipants,
    allowGroupParticipants:
      body.allowGroupParticipants !== undefined
        ? Boolean(body.allowGroupParticipants)
        : challenge.allowGroupParticipants,
  };

  const scopeError = validateInstanceScopeAgainstEvent(eventActivity, scope);
  if (scopeError) return jsonError(scopeError, "VALIDATION_ERROR", 400);

  const mode =
    body.mode === "COUNCIL" ? "COUNCIL" : body.mode === "CHAMPION" ? "CHAMPION" : challenge.mode;

  const updated = await prisma.ticTacToeChallenge.update({
    where: { id: challenge.id },
    data: {
      title: body.title?.trim() || challenge.title,
      mode,
      allowGeneralParticipants: scope.allowGeneralParticipants,
      allowGroupParticipants: scope.allowGroupParticipants,
    },
  });

  return NextResponse.json({ challenge: updated });
}
