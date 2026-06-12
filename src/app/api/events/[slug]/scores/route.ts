import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { hasPermission } from "@/lib/permissions";
import { scoreSchema } from "@/lib/validators/auth";
import { prisma } from "@/lib/prisma";
import { getIO } from "@/server/socket/io";
import { broadcastLeaderboard } from "@/server/socket/handlers";
import { jsonError } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const judgeId = hasPermission(ctx.auth.permissions, "score.view_all")
    ? new URL(request.url).searchParams.get("judgeId") ?? undefined
    : hasPermission(ctx.auth.permissions, "score.submit")
      ? ctx.auth.userId
      : undefined;

  const scores = await prisma.score.findMany({
    where: {
      team: { eventId: ctx.event.id },
      ...(judgeId ? { judgeId } : {}),
    },
    include: {
      team: true,
      criterion: true,
      judge: { select: { account: { select: { username: true } } } },
    },
  });

  return NextResponse.json({ scores });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "score.submit");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = scoreSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);

  const criterion = await prisma.scoreCriterion.findFirst({
    where: { id: parsed.data.criterionId, eventId: ctx.event.id },
  });
  if (!criterion) return jsonError("Criterion not found", "NOT_FOUND", 404);
  if (parsed.data.points > criterion.maxPoints) {
    return jsonError(`Points cannot exceed ${criterion.maxPoints}`, "VALIDATION_ERROR", 400);
  }

  const score = await prisma.score.upsert({
    where: {
      teamId_judgeId_criterionId: {
        teamId: parsed.data.teamId,
        judgeId: ctx.auth.userId,
        criterionId: parsed.data.criterionId,
      },
    },
    create: {
      teamId: parsed.data.teamId,
      judgeId: ctx.auth.userId,
      criterionId: parsed.data.criterionId,
      points: parsed.data.points,
    },
    update: { points: parsed.data.points },
    include: { team: true, criterion: true },
  });

  try {
    await broadcastLeaderboard(getIO(), ctx.event.id);
  } catch {
    // ignore
  }

  return NextResponse.json({ score });
}
