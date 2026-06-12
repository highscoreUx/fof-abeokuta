import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import {
  ACTIVITY_KAHOOT,
  validateInstanceScopeAgainstEvent,
} from "@/lib/activities/catalog";
import {
  getEventActivityBySlug,
  isActivityEnabledForEvent,
} from "@/lib/activities/event-activities";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_KAHOOT);
  const canAccess =
    hasPermission(ctx.auth.permissions, "quiz.manage") ||
    hasPermission(ctx.auth.permissions, "quiz.run");
  if (!enabled && !canAccess) {
    return jsonError("Activity not found", "NOT_FOUND", 404);
  }

  const quiz = await prisma.quiz.findFirst({
    where: { id, eventId: ctx.event.id },
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          text: true,
          options: true,
          correctIndex: true,
          timeLimitSec: true,
          sortOrder: true,
        },
      },
    },
  });
  if (!quiz) return jsonError("Activity not found", "NOT_FOUND", 404);

  return NextResponse.json({ quiz });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "quiz.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_KAHOOT);
  if (!enabled) {
    return jsonError("Live Trivia activity is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const quiz = await prisma.quiz.findFirst({
    where: { id, eventId: ctx.event.id },
  });
  if (!quiz) return jsonError("Activity instance not found", "NOT_FOUND", 404);

  const eventActivity = await getEventActivityBySlug(ctx.event.id, ACTIVITY_KAHOOT);
  if (!eventActivity) {
    return jsonError("Activity configuration missing.", "ACTIVITY_NOT_FOUND", 404);
  }

  const body = await request.json();
  const scope = {
    allowGeneralParticipants:
      body.allowGeneralParticipants !== undefined
        ? Boolean(body.allowGeneralParticipants)
        : quiz.allowGeneralParticipants,
    allowGroupParticipants:
      body.allowGroupParticipants !== undefined
        ? Boolean(body.allowGroupParticipants)
        : quiz.allowGroupParticipants,
  };

  const scopeError = validateInstanceScopeAgainstEvent(eventActivity, scope);
  if (scopeError) return jsonError(scopeError, "VALIDATION_ERROR", 400);

  const updated = await prisma.quiz.update({
    where: { id: quiz.id },
    data: {
      title: body.title ?? quiz.title,
      allowGeneralParticipants: scope.allowGeneralParticipants,
      allowGroupParticipants: scope.allowGroupParticipants,
      teamId: null,
    },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({ quiz: updated });
}
