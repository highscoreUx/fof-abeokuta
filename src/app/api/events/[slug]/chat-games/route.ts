import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { hasPermission } from "@/lib/permissions";
import { isChatGameKind } from "@/lib/chat-game-types";
import { isChatGameAllowedForChannel } from "@/lib/activities/manifest";
import { isSocialJsonGameKind } from "@/lib/social-games/kinds";
import {
  createDmHangmanSession,
  createDmSocialJsonSession,
  createDmTicTacToeSession,
  createTeamHangmanSession,
  createTeamSocialJsonSession,
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

  if (channel === "DM" && !isChatGameAllowedForChannel(kind, "DM")) {
    return jsonError("This game is only available in team chat.", "VALIDATION_ERROR", 400);
  }

  if (channel === "TEAM" && !isChatGameAllowedForChannel(kind, "TEAM")) {
    return jsonError("This game is not available in team chat.", "VALIDATION_ERROR", 400);
  }

  try {
    if (channel === "DM") {
      const peerUserId = typeof body.peerUserId === "string" ? body.peerUserId : "";
      if (!peerUserId) return jsonError("peerUserId is required", "VALIDATION_ERROR", 400);

      const base = {
        eventId: ctx.event.id,
        eventSlug: slug,
        hostUserId: ctx.auth.userId,
        peerUserId,
      };

      const session =
        kind === "hangman"
          ? await createDmHangmanSession(base)
          : isSocialJsonGameKind(kind)
            ? await createDmSocialJsonSession({ ...base, kind })
            : await createDmTicTacToeSession(base);

      return NextResponse.json({ session });
    }

    if (channel === "TEAM") {
      const teamId = typeof body.teamId === "string" ? body.teamId : "";
      if (!teamId) return jsonError("teamId is required", "VALIDATION_ERROR", 400);

      const base = {
        eventId: ctx.event.id,
        eventSlug: slug,
        hostUserId: ctx.auth.userId,
        teamId,
      };

      const session =
        kind === "hangman"
          ? await createTeamHangmanSession(base)
          : kind === "spinner"
            ? await createTeamSpinnerSession(base)
            : isSocialJsonGameKind(kind)
              ? await createTeamSocialJsonSession({ ...base, kind })
              : await createTeamTicTacToeSession(base);

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
