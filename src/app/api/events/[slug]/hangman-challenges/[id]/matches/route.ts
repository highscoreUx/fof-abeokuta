import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { ACTIVITY_HANGMAN } from "@/lib/activities/catalog";
import { isActivityEnabledForEvent } from "@/lib/activities/event-activities";
import { createHangmanMatch, listHangmanMatchesForEvent } from "@/server/games/hangmanEngine";
import { hasPermission } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: challengeId } = await params;
  const ctx = await requireEventPermission(request, slug, "hangman.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_HANGMAN);
  if (!enabled) {
    return jsonError("Hangman is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const body = await request.json();
  if (!body.teamXId || !body.teamOId) {
    return jsonError("Both teams are required.", "VALIDATION_ERROR", 400);
  }

  try {
    const match = await createHangmanMatch(
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

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_HANGMAN);
  const canAccess =
    hasPermission(ctx.auth.permissions, "hangman.manage") ||
    hasPermission(ctx.auth.permissions, "hangman.run") ||
    hasPermission(ctx.auth.permissions, "participant.hangman");
  if (!enabled && !canAccess) {
    return NextResponse.json({ matches: [] });
  }

  const matches = await listHangmanMatchesForEvent(ctx.event.id, challengeId);
  return NextResponse.json({ matches });
}
