import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { hasPermission } from "@/lib/permissions";
import { isChatGameKind } from "@/lib/chat-game-types";
import {
  createDmHangmanSession,
  createDmSpinnerSession,
  createDmTicTacToeSession,
  createTeamHangmanSession,
  createTeamSpinnerSession,
  createTeamTicTacToeSession,
} from "@/server/games/chatGameEngine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  if (!hasPermission(ctx.auth.permissions, "participant.chat")) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  const body = await request.json();
  const kind = body.kind as string;
  const channel = body.channel as string;

  if (!isChatGameKind(kind)) {
    return jsonError("Unsupported game type.", "VALIDATION_ERROR", 400);
  }

  try {
    if (channel === "DM") {
      const peerUserId = typeof body.peerUserId === "string" ? body.peerUserId : "";
      if (!peerUserId) return jsonError("peerUserId is required", "VALIDATION_ERROR", 400);

      const create =
        kind === "hangman"
          ? createDmHangmanSession
          : kind === "spinner"
            ? createDmSpinnerSession
            : createDmTicTacToeSession;

      const session = await create({
        eventId: ctx.event.id,
        eventSlug: slug,
        hostUserId: ctx.auth.userId,
        peerUserId,
      });
      return NextResponse.json({ session });
    }

    if (channel === "TEAM") {
      const teamId = typeof body.teamId === "string" ? body.teamId : "";
      if (!teamId) return jsonError("teamId is required", "VALIDATION_ERROR", 400);

      const create =
        kind === "hangman"
          ? createTeamHangmanSession
          : kind === "spinner"
            ? createTeamSpinnerSession
            : createTeamTicTacToeSession;

      const session = await create({
        eventId: ctx.event.id,
        eventSlug: slug,
        hostUserId: ctx.auth.userId,
        teamId,
      });
      return NextResponse.json({ session });
    }

    return jsonError("Invalid channel", "VALIDATION_ERROR", 400);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to start game",
      "GAME_ERROR",
      400,
    );
  }
}
