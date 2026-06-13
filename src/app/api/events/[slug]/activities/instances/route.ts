import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import {
  canAccessActivitiesAdmin,
  loadActivityInstancesForAdmin,
} from "@/lib/activities/load-activity-instances.server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  if (!canAccessActivitiesAdmin(ctx.auth.permissions)) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  const payload = await loadActivityInstancesForAdmin(ctx.event.id, {
    permissions: ctx.auth.permissions,
    teamId: ctx.auth.teamId ?? null,
  });

  return NextResponse.json(payload);
}
