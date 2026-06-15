import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import { ACTIVITY_COUNTDOWN } from "@/lib/activities/catalog";
import {
  getEventActivityBySlug,
  isActivityEnabledForEvent,
  validateActivityInstanceScope,
} from "@/lib/activities/event-activities";
import { getActiveCountdownSessionForChallenge } from "@/server/games/countdownEngine";
import { hasPermission } from "@/lib/permissions";
import { parseDurationInput } from "@/lib/countdown/format";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_COUNTDOWN);
  const canAccess =
    hasPermission(ctx.auth.permissions, "countdown.manage") ||
    hasPermission(ctx.auth.permissions, "countdown.run");
  if (!enabled && !canAccess) {
    return jsonError("Activity not found", "NOT_FOUND", 404);
  }

  const challenge = await prisma.countdownChallenge.findFirst({
    where: { id, eventId: ctx.event.id },
  });
  if (!challenge) return jsonError("Activity not found", "NOT_FOUND", 404);

  const activeSession = await getActiveCountdownSessionForChallenge(challenge.id);

  return NextResponse.json({
    challenge: {
      ...challenge,
      activeSessionId: activeSession?.id ?? null,
      activeSessionState: activeSession?.state ?? null,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "countdown.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_COUNTDOWN);
  if (!enabled) {
    return jsonError("Countdown is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const challenge = await prisma.countdownChallenge.findFirst({
    where: { id, eventId: ctx.event.id },
  });
  if (!challenge) return jsonError("Activity not found", "NOT_FOUND", 404);

  const eventActivity = await getEventActivityBySlug(ctx.event.id, ACTIVITY_COUNTDOWN);
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

  const scopeError = await validateActivityInstanceScope(ctx.event.id, eventActivity, scope);
  if (scopeError) return jsonError(scopeError, "VALIDATION_ERROR", 400);

  let durationSec = challenge.durationSec;
  if (body.durationSec != null) {
    const parsed = Number(body.durationSec);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return jsonError("Invalid duration", "VALIDATION_ERROR", 400);
    }
    durationSec = Math.round(parsed);
  } else if (body.duration?.trim()) {
    const parsed = parseDurationInput(String(body.duration));
    if (parsed == null) {
      return jsonError("Invalid duration (use seconds or M:SS)", "VALIDATION_ERROR", 400);
    }
    durationSec = parsed;
  }

  const updated = await prisma.countdownChallenge.update({
    where: { id: challenge.id },
    data: {
      title: body.title?.trim() || challenge.title,
      durationSec,
      allowGeneralParticipants: scope.allowGeneralParticipants,
      allowGroupParticipants: scope.allowGroupParticipants,
    },
  });

  return NextResponse.json({ challenge: updated });
}
