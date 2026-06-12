import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import {
  ACTIVITY_SPINNER,
  validateInstanceScopeAgainstEvent,
} from "@/lib/activities/catalog";
import {
  getEventActivityBySlug,
  isActivityEnabledForEvent,
} from "@/lib/activities/event-activities";
import { getActiveSpinnerSessionForChallenge } from "@/server/games/spinnerEngine";
import { hasPermission } from "@/lib/permissions";

function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o) => String(o).trim()).filter(Boolean);
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

  const withSessions = await Promise.all(
    challenges.map(async (challenge) => {
      const activeSession = await getActiveSpinnerSessionForChallenge(challenge.id);
      return {
        ...challenge,
        activeSessionId: activeSession?.id ?? null,
      };
    }),
  );

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

  const scopeError = validateInstanceScopeAgainstEvent(eventActivity, scope);
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
