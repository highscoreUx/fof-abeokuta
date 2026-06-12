import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import { aggregateSurveyResults } from "@/lib/survey/aggregates";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "survey.view_results");
  if (ctx instanceof NextResponse) return ctx;

  const survey = await prisma.survey.findFirst({
    where: { id, eventId: ctx.event.id },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });
  if (!survey) return jsonError("Survey not found", "NOT_FOUND", 404);

  const answers = await prisma.surveyAnswer.findMany({
    where: { question: { surveyId: id } },
    select: { questionId: true, value: true },
  });

  const results = aggregateSurveyResults(survey.questions, answers);

  return NextResponse.json({
    survey: {
      id: survey.id,
      title: survey.title,
      status: survey.status,
      responseCount: await prisma.surveyResponse.count({ where: { surveyId: id } }),
    },
    results,
  });
}
