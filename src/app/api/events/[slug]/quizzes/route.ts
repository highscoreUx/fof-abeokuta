import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import {
  ACTIVITY_KAHOOT,
  userCanAccessActivityInstance,
  validateInstanceScopeAgainstEvent,
} from "@/lib/activities/catalog";
import {
  getEventActivityBySlug,
  isActivityEnabledForEvent,
} from "@/lib/activities/event-activities";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_KAHOOT);
  if (!enabled && !hasPermission(ctx.auth.permissions, "quiz.manage")) {
    return NextResponse.json({ quizzes: [] });
  }

  const quizzes = await prisma.quiz.findMany({
    where: { eventId: ctx.event.id },
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
      sessions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const isManager = hasPermission(ctx.auth.permissions, "quiz.manage");
  const visible = isManager
    ? quizzes
    : quizzes.filter((quiz) =>
        userCanAccessActivityInstance(ctx.auth, {
          allowGeneralParticipants: quiz.allowGeneralParticipants,
          allowGroupParticipants: quiz.allowGroupParticipants,
        }),
      );

  return NextResponse.json({ quizzes: visible });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "quiz.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_KAHOOT);
  if (!enabled) {
    return jsonError("Live Trivia activity is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const eventActivity = await getEventActivityBySlug(ctx.event.id, ACTIVITY_KAHOOT);
  if (!eventActivity) {
    return jsonError("Activity configuration missing.", "ACTIVITY_NOT_FOUND", 404);
  }

  const body = await request.json();
  if (!body.title) return jsonError("Title is required", "VALIDATION_ERROR", 400);

  const scope = {
    allowGeneralParticipants: Boolean(body.allowGeneralParticipants),
    allowGroupParticipants: Boolean(body.allowGroupParticipants),
  };

  const scopeError = validateInstanceScopeAgainstEvent(eventActivity, scope);
  if (scopeError) return jsonError(scopeError, "VALIDATION_ERROR", 400);

  const quiz = await prisma.quiz.create({
    data: {
      eventId: ctx.event.id,
      title: body.title,
      allowGeneralParticipants: scope.allowGeneralParticipants,
      allowGroupParticipants: scope.allowGroupParticipants,
      teamId: null,
    },
    include: { questions: true },
  });

  return NextResponse.json({ quiz });
}
