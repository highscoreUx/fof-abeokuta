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
import { updateSocialHangmanSettings } from "@/server/games/socialHangmanEngine";
import { updateSocialChessSettings } from "@/server/games/socialChessEngine";
import { updateSocialLudoSettings } from "@/server/games/socialLudoEngine";
import { updateSocialWhotSettings } from "@/server/games/socialWhotEngine";
import { prisma } from "@/lib/prisma";

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

      const gameSession = await prisma.chatGameSession.findFirst({
        where: { id, eventId: ctx.event.id },
        select: { kind: true },
      });
      if (!gameSession) return jsonError("Game not found", "NOT_FOUND", 404);

      if (gameSession.kind === "hangman") {
        const topicMode =
          settings.topicMode === "topic"
            ? "topic"
            : settings.topicMode === "random"
              ? "random"
              : undefined;
        const topicId = typeof settings.topicId === "string" ? settings.topicId : undefined;
        const session = await updateSocialHangmanSettings({
          sessionId: id,
          eventId: ctx.event.id,
          eventSlug: slug,
          userId: ctx.auth.userId,
          settings: {
            seriesMode: settings.seriesMode === "race" ? "race" : settings.seriesMode === "single" ? "single" : undefined,
            raceTarget:
              typeof settings.raceTarget === "number" ? settings.raceTarget : undefined,
            maxWrongGuesses:
              typeof settings.maxWrongGuesses === "number"
                ? settings.maxWrongGuesses
                : undefined,
            turnTimerEnabled:
              typeof settings.turnTimerEnabled === "boolean"
                ? settings.turnTimerEnabled
                : undefined,
            turnTimerSeconds:
              typeof settings.turnTimerSeconds === "number"
                ? settings.turnTimerSeconds
                : undefined,
            topicMode,
            topicId: topicId === null ? null : topicId,
          },
        });
        return NextResponse.json({ session });
      }

      if (gameSession.kind === "chess") {
        const session = await updateSocialChessSettings({
          sessionId: id,
          eventId: ctx.event.id,
          eventSlug: slug,
          userId: ctx.auth.userId,
          settings: {
            showLegalMoves:
              typeof settings.showLegalMoves === "boolean" ? settings.showLegalMoves : undefined,
            turnTimerEnabled:
              typeof settings.turnTimerEnabled === "boolean"
                ? settings.turnTimerEnabled
                : undefined,
            turnTimerSeconds:
              typeof settings.turnTimerSeconds === "number"
                ? settings.turnTimerSeconds
                : undefined,
          },
        });
        return NextResponse.json({ session });
      }

      if (gameSession.kind === "ludo") {
        const session = await updateSocialLudoSettings({
          sessionId: id,
          eventId: ctx.event.id,
          eventSlug: slug,
          userId: ctx.auth.userId,
          settings: {
            showAnimations:
              typeof settings.showAnimations === "boolean" ? settings.showAnimations : undefined,
            turnTimerEnabled:
              typeof settings.turnTimerEnabled === "boolean"
                ? settings.turnTimerEnabled
                : undefined,
            turnTimerSeconds:
              typeof settings.turnTimerSeconds === "number"
                ? settings.turnTimerSeconds
                : undefined,
          },
        });
        return NextResponse.json({ session });
      }

      if (gameSession.kind === "whot") {
        const session = await updateSocialWhotSettings({
          sessionId: id,
          eventId: ctx.event.id,
          eventSlug: slug,
          userId: ctx.auth.userId,
          settings: {
            cardsPerPlayer:
              typeof settings.cardsPerPlayer === "number" ? settings.cardsPerPlayer : undefined,
            enforceLastCardCall:
              typeof settings.enforceLastCardCall === "boolean"
                ? settings.enforceLastCardCall
                : undefined,
            lastCardPenaltyCards:
              typeof settings.lastCardPenaltyCards === "number"
                ? settings.lastCardPenaltyCards
                : undefined,
            turnTimerEnabled:
              typeof settings.turnTimerEnabled === "boolean"
                ? settings.turnTimerEnabled
                : undefined,
            turnTimerSeconds:
              typeof settings.turnTimerSeconds === "number"
                ? settings.turnTimerSeconds
                : undefined,
            pick2AllowBlock:
              typeof settings.pick2AllowBlock === "boolean"
                ? settings.pick2AllowBlock
                : undefined,
            pick2AllowStacking:
              typeof settings.pick2AllowStacking === "boolean"
                ? settings.pick2AllowStacking
                : undefined,
            allowPick3:
              typeof settings.allowPick3 === "boolean" ? settings.allowPick3 : undefined,
            pick3AllowBlock:
              typeof settings.pick3AllowBlock === "boolean"
                ? settings.pick3AllowBlock
                : undefined,
            pick3AllowStacking:
              typeof settings.pick3AllowStacking === "boolean"
                ? settings.pick3AllowStacking
                : undefined,
            allowSuspension:
              typeof settings.allowSuspension === "boolean"
                ? settings.allowSuspension
                : undefined,
            allowTender:
              typeof settings.allowTender === "boolean" ? settings.allowTender : undefined,
          },
        });
        return NextResponse.json({ session });
      }

      if (gameSession.kind === "tic_tac_toe") {
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

      return jsonError("Settings are not available for this game.", "VALIDATION_ERROR", 400);
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
