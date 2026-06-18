import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import { ACTIVITY_HANGMAN } from "@/lib/activities/catalog";
import {
  getEventActivityBySlug,
  isActivityEnabledForEvent,
  validateActivityInstanceScope,
} from "@/lib/activities/event-activities";
import { normalizeHangmanWord, parseHangmanWords } from "@/lib/hangman/types";
import { hasPermission } from "@/lib/permissions";
import { isChatSocialChallengeTitle } from "@/lib/chat-social-challenges";
import {
  buildActivityBracketSnapshot,
  getBracketForChallenge,
} from "@/server/games/activityBracketEngine";

function normalizeWords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((w) => normalizeHangmanWord(String(w))).filter(Boolean);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_HANGMAN);
  const canAccess =
    hasPermission(ctx.auth.permissions, "hangman.manage") ||
    hasPermission(ctx.auth.permissions, "hangman.run");
  if (!enabled && !canAccess) {
    return jsonError("Activity not found", "NOT_FOUND", 404);
  }

  const challenge = await prisma.hangmanChallenge.findFirst({
    where: { id, eventId: ctx.event.id },
    include: {
      matches: {
        include: { teamX: true, teamO: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!challenge) return jsonError("Activity not found", "NOT_FOUND", 404);
  if (isChatSocialChallengeTitle(challenge.title)) {
    return jsonError("Activity not found", "NOT_FOUND", 404);
  }

  const bracketRecord = await getBracketForChallenge("hangman", challenge.id);
  const bracket = bracketRecord
    ? await buildActivityBracketSnapshot(bracketRecord.id)
    : null;

  return NextResponse.json({
    challenge: {
      ...challenge,
      words: parseHangmanWords(challenge.config),
      bracket,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "hangman.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_HANGMAN);
  if (!enabled) {
    return jsonError("Hangman is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const challenge = await prisma.hangmanChallenge.findFirst({
    where: { id, eventId: ctx.event.id },
  });
  if (!challenge) return jsonError("Activity not found", "NOT_FOUND", 404);

  const eventActivity = await getEventActivityBySlug(ctx.event.id, ACTIVITY_HANGMAN);
  if (!eventActivity) {
    return jsonError("Activity configuration missing.", "ACTIVITY_NOT_FOUND", 404);
  }

  const body = await request.json();

  const scope = {
    allowGeneralParticipants:
      body.allowGeneralParticipants !== undefined
        ? Boolean(body.allowGeneralParticipants)
        : challenge.allowGeneralParticipants,
    allowGroupParticipants:
      body.allowGroupParticipants !== undefined
        ? Boolean(body.allowGroupParticipants)
        : challenge.allowGroupParticipants,
  };

  const scopeError = await validateActivityInstanceScope(ctx.event.id, eventActivity, scope);
  if (scopeError) return jsonError(scopeError, "VALIDATION_ERROR", 400);

  const mode =
    body.mode === "COUNCIL" ? "COUNCIL" : body.mode === "CHAMPION" ? "CHAMPION" : challenge.mode;

  const existingWords = parseHangmanWords(challenge.config);
  const words = body.words !== undefined ? normalizeWords(body.words) : existingWords;

  const maxWrongGuesses =
    body.maxWrongGuesses != null && Number(body.maxWrongGuesses) > 0
      ? Math.min(10, Math.round(Number(body.maxWrongGuesses)))
      : challenge.maxWrongGuesses;

  const competitionFormat =
    body.competitionFormat === "CHAMPIONSHIP"
      ? "CHAMPIONSHIP"
      : body.competitionFormat === "SINGLE_MATCH"
        ? "SINGLE_MATCH"
        : challenge.competitionFormat;

  const targetWins =
    body.targetWins != null && Number(body.targetWins) > 0
      ? Math.min(20, Math.round(Number(body.targetWins)))
      : challenge.targetWins;

  const updated = await prisma.hangmanChallenge.update({
    where: { id: challenge.id },
    data: {
      title: body.title?.trim() || challenge.title,
      mode,
      competitionFormat,
      targetWins,
      maxWrongGuesses,
      config: { words },
      allowGeneralParticipants: scope.allowGeneralParticipants,
      allowGroupParticipants: scope.allowGroupParticipants,
    },
  });

  return NextResponse.json({ challenge: { ...updated, words } });
}
