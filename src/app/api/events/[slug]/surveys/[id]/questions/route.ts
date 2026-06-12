import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import { surveyQuestionSchema } from "@/lib/validators/survey";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: surveyId } = await params;
  const ctx = await requireEventPermission(request, slug, "survey.manage");
  if (ctx instanceof NextResponse) return ctx;

  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, eventId: ctx.event.id },
  });
  if (!survey) return jsonError("Survey not found", "NOT_FOUND", 404);

  const body = await request.json();
  const parsed = surveyQuestionSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);

  const count = await prisma.surveyQuestion.count({ where: { surveyId } });
  const question = await prisma.surveyQuestion.create({
    data: {
      surveyId,
      type: parsed.data.type,
      text: parsed.data.text,
      config: parsed.data.config as object,
      mediaKey: parsed.data.mediaKey ?? null,
      mediaUrl: parsed.data.mediaUrl ?? null,
      required: parsed.data.required ?? false,
      sortOrder: count,
    },
  });

  return NextResponse.json({ question });
}
