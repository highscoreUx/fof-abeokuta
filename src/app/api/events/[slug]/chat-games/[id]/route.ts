import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import {
  cancelChatGameSession,
  getChatGameSessionForUser,
  inviteSpectatorsToChatGame,
  joinChatGameSession,
  rematchSocialChatGame,
  startChatGameSessionByHost,
} from "@/server/games/chatGameEngine";
import { updateSocialTttSettings } from "@/server/games/socialTttEngine";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const session = await getChatGameSessionForUser(id, ctx.auth.userId, slug);
  if (!session) return jsonError("Game not found", "NOT_FOUND", 404);

  return NextResponse.json({ session });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const action = body.action as string;

  try {
    if (action === "join") {
      const session = await joinChatGameSession({
        sessionId: id,
        eventId: ctx.event.id,
        eventSlug: slug,
        userId: ctx.auth.userId,
        asSpectator: Boolean(body.asSpectator),
      });
      return NextResponse.json({ session });
    }

    if (action === "start") {
      const session = await startChatGameSessionByHost({
        sessionId: id,
        eventId: ctx.event.id,
        eventSlug: slug,
        userId: ctx.auth.userId,
      });
      return NextResponse.json({ session });
    }

    if (action === "cancel") {
      const session = await cancelChatGameSession({
        sessionId: id,
        eventId: ctx.event.id,
        eventSlug: slug,
        userId: ctx.auth.userId,
      });
      return NextResponse.json({ session });
    }

    if (action === "invite") {
      const inviteeUserIds = Array.isArray(body.inviteeUserIds)
        ? body.inviteeUserIds.filter((id: unknown): id is string => typeof id === "string")
        : [];
      const session = await inviteSpectatorsToChatGame({
        sessionId: id,
        eventId: ctx.event.id,
        eventSlug: slug,
        userId: ctx.auth.userId,
        inviteeUserIds,
      });
      return NextResponse.json({ session });
    }

    if (action === "rematch") {
      const session = await rematchSocialChatGame({
        sessionId: id,
        eventId: ctx.event.id,
        eventSlug: slug,
        userId: ctx.auth.userId,
      });
      return NextResponse.json({ session });
    }

    if (action === "update_settings") {
      const settings =
        body.settings && typeof body.settings === "object"
          ? (body.settings as Record<string, unknown>)
          : {};
      const session = await updateSocialTttSettings({
        sessionId: id,
        eventId: ctx.event.id,
        eventSlug: slug,
        userId: ctx.auth.userId,
        settings: {
          seriesMode: settings.seriesMode === "race" ? "race" : "single",
          raceTarget:
            typeof settings.raceTarget === "number" ? settings.raceTarget : undefined,
          turnTimerEnabled:
            typeof settings.turnTimerEnabled === "boolean"
              ? settings.turnTimerEnabled
              : undefined,
          turnTimerSeconds:
            typeof settings.turnTimerSeconds === "number"
              ? settings.turnTimerSeconds
              : undefined,
          endOnDraw:
            typeof settings.endOnDraw === "boolean" ? settings.endOnDraw : undefined,
        },
      });
      return NextResponse.json({ session });
    }

    return jsonError("Unknown action", "VALIDATION_ERROR", 400);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Action failed",
      "GAME_ERROR",
      400,
    );
  }
}
