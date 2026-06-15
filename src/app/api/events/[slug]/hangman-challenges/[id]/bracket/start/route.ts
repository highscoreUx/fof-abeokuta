import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import { ACTIVITY_HANGMAN } from "@/lib/activities/catalog";
import { isActivityEnabledForEvent } from "@/lib/activities/event-activities";
import { tryGetIO } from "@/server/socket/io";
import { startActivityChampionship } from "@/server/games/activityBracketEngine";

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

  const challenge = await prisma.hangmanChallenge.findFirst({
    where: { id: challengeId, eventId: ctx.event.id },
  });
  if (!challenge) return jsonError("Activity not found", "NOT_FOUND", 404);
  if (challenge.competitionFormat !== "CHAMPIONSHIP") {
    return jsonError("Enable championship format first.", "VALIDATION_ERROR", 400);
  }

  const io = tryGetIO();
  if (!io) return jsonError("Realtime server unavailable", "SERVER_ERROR", 503);

  try {
    const snapshot = await startActivityChampionship(io, {
      gameType: "hangman",
      challengeId,
      eventId: ctx.event.id,
      eventSlug: slug,
      targetWins: challenge.targetWins,
    });
    return NextResponse.json({ bracket: snapshot });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to start championship",
      "VALIDATION_ERROR",
      400,
    );
  }
}
