import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import { ACTIVITY_TIC_TAC_TOE } from "@/lib/activities/catalog";
import {
  getEventActivityBySlug,
  isActivityEnabledForEvent,
  validateActivityInstanceScope,
} from "@/lib/activities/event-activities";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_TIC_TAC_TOE);
  if (!enabled && !hasPermission(ctx.auth.permissions, "tic_tac_toe.manage")) {
    return NextResponse.json({ challenges: [] });
  }

  const challenges = await prisma.ticTacToeChallenge.findMany({
    where: { eventId: ctx.event.id },
    include: {
      matches: {
        where: { state: { in: ["WAITING", "ACTIVE"] } },
        select: { id: true, state: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const withActive = challenges.map((c) => ({
    ...c,
    activeMatchId: c.matches[0]?.id ?? null,
    activeMatchState: c.matches[0]?.state ?? null,
    matches: undefined,
  }));

  return NextResponse.json({ challenges: withActive });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "tic_tac_toe.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_TIC_TAC_TOE);
  if (!enabled) {
    return jsonError("Team Tic-Tac-Toe is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const eventActivity = await getEventActivityBySlug(ctx.event.id, ACTIVITY_TIC_TAC_TOE);
  if (!eventActivity) {
    return jsonError("Activity configuration missing.", "ACTIVITY_NOT_FOUND", 404);
  }

  const body = await request.json();
  if (!body.title?.trim()) return jsonError("Title is required", "VALIDATION_ERROR", 400);

  const scope = {
    allowGeneralParticipants: Boolean(body.allowGeneralParticipants),
    allowGroupParticipants: Boolean(body.allowGroupParticipants),
  };

  const scopeError = await validateActivityInstanceScope(ctx.event.id, eventActivity, scope);
  if (scopeError) return jsonError(scopeError, "VALIDATION_ERROR", 400);

  const mode = body.mode === "COUNCIL" ? "COUNCIL" : "CHAMPION";

  const challenge = await prisma.ticTacToeChallenge.create({
    data: {
      eventId: ctx.event.id,
      title: body.title.trim(),
      mode,
      allowGeneralParticipants: scope.allowGeneralParticipants,
      allowGroupParticipants: scope.allowGroupParticipants,
    },
  });

  return NextResponse.json({ challenge });
}
