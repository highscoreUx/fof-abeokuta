import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import {
  ACTIVITY_SURVEY,
  userCanAccessActivityInstance,
} from "@/lib/activities/catalog";
import { isActivityEnabledForEvent } from "@/lib/activities/event-activities";
import { hasPermission } from "@/lib/permissions";
import { canEditSurveyResponse, isSurveyOpen } from "@/lib/survey/types";
import { surveySubmitSchema } from "@/lib/validators/survey";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: surveyId } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  if (!hasPermission(ctx.auth.permissions, "participant.survey")) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_SURVEY);
  if (!enabled) return jsonError("Survey activity is not enabled", "ACTIVITY_DISABLED", 403);

  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, eventId: ctx.event.id },
    include: { questions: true },
  });
  if (!survey) return jsonError("Survey not found", "NOT_FOUND", 404);

  if (
    !userCanAccessActivityInstance(ctx.auth, {
      allowGeneralParticipants: survey.allowGeneralParticipants,
      allowGroupParticipants: survey.allowGroupParticipants,
    })
  ) {
    return jsonError("You cannot access this survey", "FORBIDDEN", 403);
  }

  if (!isSurveyOpen(survey)) {
    return jsonError("Survey is not open", "SURVEY_CLOSED", 400);
  }

  const body = await request.json();
  const parsed = surveySubmitSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);

  const existing = await prisma.surveyResponse.findUnique({
    where: { surveyId_userId: { surveyId, userId: ctx.auth.userId } },
  });

  if (existing && !canEditSurveyResponse(survey)) {
    return jsonError("You have already submitted this survey", "ALREADY_SUBMITTED", 400);
  }

  const questionIds = new Set(survey.questions.map((q) => q.id));
  for (const answer of parsed.data.answers) {
    if (!questionIds.has(answer.questionId)) {
      return jsonError("Invalid question", "VALIDATION_ERROR", 400);
    }
  }

  const response = existing
    ? await prisma.surveyResponse.update({
        where: { id: existing.id },
        data: { updatedAt: new Date() },
      })
    : await prisma.surveyResponse.create({
        data: { surveyId, userId: ctx.auth.userId },
      });

  for (const answer of parsed.data.answers) {
    await prisma.surveyAnswer.upsert({
      where: {
        responseId_questionId: {
          responseId: response.id,
          questionId: answer.questionId,
        },
      },
      create: {
        responseId: response.id,
        questionId: answer.questionId,
        value: answer.value,
      },
      update: { value: answer.value, updatedAt: new Date() },
    });
  }

  return NextResponse.json({ responseId: response.id });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: surveyId } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const response = await prisma.surveyResponse.findUnique({
    where: { surveyId_userId: { surveyId, userId: ctx.auth.userId } },
    include: { answers: true },
  });

  return NextResponse.json({ response });
}
