import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { ACTIVITY_TIC_TAC_TOE } from "@/lib/activities/catalog";
import { isActivityEnabledForEvent } from "@/lib/activities/event-activities";
import { createTttMatch } from "@/server/games/ticTacToeEngine";
import { hasPermission } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: challengeId } = await params;
  const ctx = await requireEventPermission(request, slug, "tic_tac_toe.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_TIC_TAC_TOE);
  if (!enabled) {
    return jsonError("Team Tic-Tac-Toe is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const body = await request.json();
  if (!body.teamXId || !body.teamOId) {
    return jsonError("Both teams are required.", "VALIDATION_ERROR", 400);
  }

  try {
    const match = await createTttMatch(
      challengeId,
      ctx.event.id,
      String(body.teamXId),
      String(body.teamOId),
    );
    return NextResponse.json({ match });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to create match",
      "VALIDATION_ERROR",
      400,
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: challengeId } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_TIC_TAC_TOE);
  const canAccess =
    hasPermission(ctx.auth.permissions, "tic_tac_toe.manage") ||
    hasPermission(ctx.auth.permissions, "tic_tac_toe.run") ||
    hasPermission(ctx.auth.permissions, "participant.tic_tac_toe");
  if (!enabled && !canAccess) {
    return NextResponse.json({ matches: [] });
  }

  const { listTttMatchesForEvent } = await import("@/server/games/ticTacToeEngine");
  const matches = await listTttMatchesForEvent(ctx.event.id, challengeId);
  return NextResponse.json({ matches });
}
