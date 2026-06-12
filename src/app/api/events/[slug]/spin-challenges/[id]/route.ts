import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import { ACTIVITY_SPIN_TO_BUILD } from "@/lib/activities/catalog";
import { isActivityEnabledForEvent } from "@/lib/activities/event-activities";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const enabled = await isActivityEnabledForEvent(ctx.event.id, ACTIVITY_SPIN_TO_BUILD);
  const canAccess =
    hasPermission(ctx.auth.permissions, "spin.manage") ||
    hasPermission(ctx.auth.permissions, "spin.run");
  if (!enabled && !canAccess) {
    return jsonError("Activity not found", "NOT_FOUND", 404);
  }

  const challenge = await prisma.spinChallenge.findFirst({
    where: { id, eventId: ctx.event.id },
  });
  if (!challenge) return jsonError("Activity not found", "NOT_FOUND", 404);

  return NextResponse.json({ challenge });
}
