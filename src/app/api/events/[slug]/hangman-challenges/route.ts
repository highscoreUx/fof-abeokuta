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
import { getBracketForChallenge } from "@/server/games/activityBracketEngine";

function normalizeWords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((w) => normalizeHangmanWord(String(w))).filter(Boolean);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_HANGMAN);
  if (!enabled && !hasPermission(ctx.auth.permissions, "hangman.manage")) {
    return NextResponse.json({ challenges: [] });
  }

  const challenges = await prisma.hangmanChallenge.findMany({
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

  const withActive = await Promise.all(
    challenges.map(async (c) => {
      const bracket = await getBracketForChallenge("hangman", c.id);
      return {
        ...c,
        wordCount: parseHangmanWords(c.config).length,
        activeMatchId: c.matches[0]?.id ?? null,
        activeMatchState: c.matches[0]?.state ?? null,
        bracketState: bracket?.state ?? null,
        matches: undefined,
      };
    }),
  );

  return NextResponse.json({ challenges: withActive });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "hangman.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_HANGMAN);
  if (!enabled) {
    return jsonError("Hangman is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const eventActivity = await getEventActivityBySlug(ctx.event.id, ACTIVITY_HANGMAN);
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
  const words = body.words !== undefined ? normalizeWords(body.words) : [];
  const maxWrongGuesses =
    body.maxWrongGuesses != null && Number(body.maxWrongGuesses) > 0
      ? Math.min(10, Math.round(Number(body.maxWrongGuesses)))
      : 6;

  const challenge = await prisma.hangmanChallenge.create({
    data: {
      eventId: ctx.event.id,
      title: body.title.trim(),
      mode,
      maxWrongGuesses,
      config: { words },
      allowGeneralParticipants: scope.allowGeneralParticipants,
      allowGroupParticipants: scope.allowGroupParticipants,
    },
  });

  return NextResponse.json({ challenge });
}
