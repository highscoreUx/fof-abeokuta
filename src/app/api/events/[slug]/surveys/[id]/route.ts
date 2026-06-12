import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import { ACTIVITY_SURVEY } from "@/lib/activities/catalog";
import { isActivityEnabledForEvent } from "@/lib/activities/event-activities";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_SURVEY);
  const canAccess =
    hasPermission(ctx.auth.permissions, "survey.manage") ||
    hasPermission(ctx.auth.permissions, "survey.run") ||
    hasPermission(ctx.auth.permissions, "participant.survey");
  if (!enabled && !canAccess) {
    return jsonError("Survey not found", "NOT_FOUND", 404);
  }

  const survey = await prisma.survey.findFirst({
    where: { id, eventId: ctx.event.id },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      _count: { select: { responses: true } },
    },
  });
  if (!survey) return jsonError("Survey not found", "NOT_FOUND", 404);

  return NextResponse.json({ survey });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "survey.manage");
  if (ctx instanceof NextResponse) return ctx;

  const survey = await prisma.survey.findFirst({ where: { id, eventId: ctx.event.id } });
  if (!survey) return jsonError("Survey not found", "NOT_FOUND", 404);

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title;
  if (body.status !== undefined) data.status = body.status;
  if (body.opensAt !== undefined) data.opensAt = body.opensAt ? new Date(body.opensAt) : null;
  if (body.closesAt !== undefined) data.closesAt = body.closesAt ? new Date(body.closesAt) : null;
  if (body.allowEditsUntilClose !== undefined) {
    data.allowEditsUntilClose = Boolean(body.allowEditsUntilClose);
  }
  if (body.allowGeneralParticipants !== undefined) {
    data.allowGeneralParticipants = Boolean(body.allowGeneralParticipants);
  }
  if (body.allowGroupParticipants !== undefined) {
    data.allowGroupParticipants = Boolean(body.allowGroupParticipants);
  }

  const updated = await prisma.survey.update({
    where: { id: survey.id },
    data,
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ survey: updated });
}
