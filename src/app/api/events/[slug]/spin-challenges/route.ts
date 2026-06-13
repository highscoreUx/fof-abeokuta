import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import {
  ACTIVITY_SPINNER,
} from "@/lib/activities/catalog";
import {
  getEventActivityBySlug,
  isActivityEnabledForEvent,
  validateActivityInstanceScope,
} from "@/lib/activities/event-activities";
import { mapActiveSpinnerSessionsByChallengeId } from "@/server/games/spinnerEngine";
import { hasPermission } from "@/lib/permissions";

function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o) => String(o).trim()).filter(Boolean);
}

function spinOptionsCount(config: unknown): number {
  return normalizeOptions((config as { options?: unknown } | null)?.options).length;
}

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

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_SPINNER);
  if (!enabled && !hasPermission(ctx.auth.permissions, "spin.manage")) {
    return NextResponse.json({ challenges: [] });
  }

  const challenges = await prisma.spinChallenge.findMany({
    where: { eventId: ctx.event.id },
    orderBy: { createdAt: "desc" },
  });

  const activeSessions = await mapActiveSpinnerSessionsByChallengeId(
    challenges.map((challenge) => challenge.id),
  );

  const listView = isListView(request);

  const withSessions = challenges.map((challenge) => {
    const activeSessionId = activeSessions.get(challenge.id) ?? null;
    if (listView) {
      return {
        id: challenge.id,
        title: challenge.title,
        allowGeneralParticipants: challenge.allowGeneralParticipants,
        allowGroupParticipants: challenge.allowGroupParticipants,
        participationMode: challenge.participationMode,
        optionsCount: spinOptionsCount(challenge.config),
        activeSessionId,
      };
    }
    return {
      ...challenge,
      activeSessionId,
    };
  });

  return NextResponse.json({ challenges: withSessions });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "spin.manage");
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_SPINNER);
  if (!enabled) {
    return jsonError("Spinner is not enabled for this event.", "ACTIVITY_DISABLED", 403);
  }

  const eventActivity = await getEventActivityBySlug(ctx.event.id, ACTIVITY_SPINNER);
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

  const options = normalizeOptions(body.options);
  const participationMode =
    body.participationMode === "CONCURRENT" ? "CONCURRENT" : "ONE_AT_A_TIME";

  const challenge = await prisma.spinChallenge.create({
    data: {
      eventId: ctx.event.id,
      title: body.title.trim(),
      config: { options },
      state: "IDLE",
      participationMode,
      allowGeneralParticipants: scope.allowGeneralParticipants,
      allowGroupParticipants: scope.allowGroupParticipants,
      teamId: null,
    },
  });

  return NextResponse.json({ challenge });
}
