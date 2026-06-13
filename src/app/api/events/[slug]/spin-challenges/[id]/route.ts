import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import { ACTIVITY_SPINNER } from "@/lib/activities/catalog";
import {
  getEventActivityBySlug,
  isActivityEnabledForEvent,
  validateActivityInstanceScope,
} from "@/lib/activities/event-activities";
import { getActiveSpinnerSessionForChallenge } from "@/server/games/spinnerEngine";
import { hasPermission } from "@/lib/permissions";

function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o) => String(o).trim()).filter(Boolean);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_SPINNER);
  const canAccess =
    hasPermission(ctx.auth.permissions, "spin.manage") ||
    hasPermission(ctx.auth.permissions, "spin.run");
  if (!enabled && !canAccess) {
    return jsonError("Activity not found", "NOT_FOUND", 404);
  }

  const challenge = await prisma.spinChallenge.findFirst({
    where: { id, eventId: ctx.event.id },
  });
  if (!challenge) return jsonError("Activity not found", "NOT_FOUND", 404);

  const activeSession = await getActiveSpinnerSessionForChallenge(challenge.id);

  return NextResponse.json({
    challenge: {
      ...challenge,
      activeSessionId: activeSession?.id ?? null,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "spin.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_SPINNER);
  if (!enabled) {
    return jsonError("Spinner is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const challenge = await prisma.spinChallenge.findFirst({
    where: { id, eventId: ctx.event.id },
  });
  if (!challenge) return jsonError("Activity not found", "NOT_FOUND", 404);

  const eventActivity = await getEventActivityBySlug(ctx.event.id, ACTIVITY_SPINNER);
  if (!eventActivity) {
    return jsonError("Activity configuration missing.", "ACTIVITY_NOT_FOUND", 404);
  }

  const body = await request.json();
  const existingConfig = (challenge.config ?? {}) as Record<string, unknown>;
  const options =
    body.options !== undefined ? normalizeOptions(body.options) : normalizeOptions(existingConfig.options);

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

  const participationMode =
    body.participationMode === "CONCURRENT"
      ? "CONCURRENT"
      : body.participationMode === "ONE_AT_A_TIME"
        ? "ONE_AT_A_TIME"
        : challenge.participationMode;

  const updated = await prisma.spinChallenge.update({
    where: { id: challenge.id },
    data: {
      title: body.title?.trim() || challenge.title,
      config: { ...existingConfig, options },
      participationMode,
      allowGeneralParticipants: scope.allowGeneralParticipants,
      allowGroupParticipants: scope.allowGroupParticipants,
    },
  });

  return NextResponse.json({ challenge: updated });
}
