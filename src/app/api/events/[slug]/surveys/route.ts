import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import {
  ACTIVITY_SURVEY,
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

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_SURVEY);
  if (!enabled && !hasPermission(ctx.auth.permissions, "survey.manage")) {
    return NextResponse.json({ surveys: [] });
  }

  const surveys = await prisma.survey.findMany({
    where: { eventId: ctx.event.id },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      _count: { select: { responses: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const isManager =
    hasPermission(ctx.auth.permissions, "survey.manage") ||
    hasPermission(ctx.auth.permissions, "survey.run");

  const visible = isManager
    ? surveys
    : surveys.filter((survey) =>
        userCanAccessActivityInstance(ctx.auth, {
          allowGeneralParticipants: survey.allowGeneralParticipants,
          allowGroupParticipants: survey.allowGroupParticipants,
        }),
      );

  return NextResponse.json({ surveys: visible });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "survey.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_SURVEY);
  if (!enabled) {
    return jsonError("Survey activity is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const eventActivity = await getEventActivityBySlug(ctx.event.id, ACTIVITY_SURVEY);
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

  const survey = await prisma.survey.create({
    data: {
      eventId: ctx.event.id,
      title: body.title,
      allowGeneralParticipants: scope.allowGeneralParticipants,
      allowGroupParticipants: scope.allowGroupParticipants,
      allowEditsUntilClose: body.allowEditsUntilClose !== false,
      opensAt: body.opensAt ? new Date(body.opensAt) : null,
      closesAt: body.closesAt ? new Date(body.closesAt) : null,
    },
    include: { questions: true },
  });

  return NextResponse.json({ survey });
}
