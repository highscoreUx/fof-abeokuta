import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { loadEventActivities } from "@/lib/activities/event-activities";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const rows = await loadEventActivities(ctx.event.id);

  return NextResponse.json({
    activities: rows.map((row) => ({
      slug: row.activityType.slug,
      name: row.activityType.name,
      description: row.activityType.description,
      enabled: row.enabled,
      allowGeneral: row.allowGeneral,
      allowGroup: row.allowGroup,
      allowStaff: row.allowStaff,
    })),
  });
}
