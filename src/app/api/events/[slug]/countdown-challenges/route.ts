import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import { ACTIVITY_COUNTDOWN } from "@/lib/activities/catalog";
import {
  getEventActivityBySlug,
  isActivityEnabledForEvent,
  validateActivityInstanceScope,
} from "@/lib/activities/event-activities";
import { mapActiveCountdownSessionsByChallengeId } from "@/server/games/countdownEngine";
import { hasPermission } from "@/lib/permissions";
import { parseDurationInput } from "@/lib/countdown/format";

function isListView(request: NextRequest) {
  return new URL(request.url).searchParams.get("view") === "list";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_COUNTDOWN);
  if (!enabled && !hasPermission(ctx.auth.permissions, "countdown.manage")) {
    return NextResponse.json({ challenges: [] });
  }

  const challenges = await prisma.countdownChallenge.findMany({
    where: { eventId: ctx.event.id },
    orderBy: { createdAt: "desc" },
  });

  const activeSessions = await mapActiveCountdownSessionsByChallengeId(
    challenges.map((challenge) => challenge.id),
  );

  const listView = isListView(request);

  const withSessions = challenges.map((challenge) => {
    const active = activeSessions.get(challenge.id);
    if (listView) {
      return {
        id: challenge.id,
        title: challenge.title,
        durationSec: challenge.durationSec,
        allowGeneralParticipants: challenge.allowGeneralParticipants,
        allowGroupParticipants: challenge.allowGroupParticipants,
        activeSessionId: active?.id ?? null,
        activeSessionState: active?.state ?? null,
      };
    }
    return {
      ...challenge,
      activeSessionId: active?.id ?? null,
      activeSessionState: active?.state ?? null,
    };
  });

  return NextResponse.json({ challenges: withSessions });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "countdown.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_COUNTDOWN);
  if (!enabled) {
    return jsonError("Countdown is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const eventActivity = await getEventActivityBySlug(ctx.event.id, ACTIVITY_COUNTDOWN);
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

  let durationSec = 300;
  if (body.durationSec != null) {
    const parsed = Number(body.durationSec);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return jsonError("Invalid duration", "VALIDATION_ERROR", 400);
    }
    durationSec = Math.round(parsed);
  } else if (body.duration?.trim()) {
    const parsed = parseDurationInput(String(body.duration));
    if (parsed == null) {
      return jsonError("Invalid duration (use seconds or M:SS)", "VALIDATION_ERROR", 400);
    }
    durationSec = parsed;
  }

  const challenge = await prisma.countdownChallenge.create({
    data: {
      eventId: ctx.event.id,
      title: body.title.trim(),
      durationSec,
      allowGeneralParticipants: scope.allowGeneralParticipants,
      allowGroupParticipants: scope.allowGroupParticipants,
    },
  });

  return NextResponse.json({ challenge });
}
