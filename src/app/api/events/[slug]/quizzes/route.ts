import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const quizzes = await prisma.quiz.findMany({
    where: { eventId: ctx.event.id },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      sessions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ quizzes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "quiz.manage");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  if (!body.title) return jsonError("Title is required", "VALIDATION_ERROR", 400);

  const quiz = await prisma.quiz.create({
    data: { eventId: ctx.event.id, title: body.title },
    include: { questions: true },
  });

  return NextResponse.json({ quiz });
}
