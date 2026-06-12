import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";
import { ensureEventActivityRows, invalidateEventCaches } from "@/lib/activities/event-activities";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(_request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return jsonError("Event not found", "NOT_FOUND", 404);

  await ensureEventActivityRows(event.id);
  const activities = await prisma.eventActivity.findMany({
    where: { eventId: event.id },
    include: { activityType: true },
    orderBy: { activityType: { sortOrder: "asc" } },
  });

  return NextResponse.json({
    activities: activities.map((row) => ({
      id: row.id,
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

const updateSchema = z.object({
  activities: z.array(
    z.object({
      slug: z.string(),
      enabled: z.boolean(),
      allowGeneral: z.boolean(),
      allowGroup: z.boolean(),
      allowStaff: z.boolean().optional(),
    }),
  ),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return jsonError("Event not found", "NOT_FOUND", 404);

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  await ensureEventActivityRows(event.id);

  for (const item of parsed.data.activities) {
    const activityType = await prisma.activityType.findUnique({ where: { slug: item.slug } });
    if (!activityType) continue;

    if (item.enabled && !item.allowGeneral && !item.allowGroup && !item.allowStaff) {
      return jsonError(
        "Enabled activities must allow at least one scope mode.",
        "VALIDATION_ERROR",
        400,
      );
    }

    await prisma.eventActivity.update({
      where: { eventId_activityTypeId: { eventId: event.id, activityTypeId: activityType.id } },
      data: {
        enabled: item.enabled,
        allowGeneral: item.allowGeneral,
        allowGroup: item.allowGroup,
        allowStaff: item.allowStaff ?? false,
      },
    });
  }

  await invalidateEventCaches(event.id, event.slug);

  const activities = await prisma.eventActivity.findMany({
    where: { eventId: event.id },
    include: { activityType: true },
    orderBy: { activityType: { sortOrder: "asc" } },
  });

  return NextResponse.json({
    activities: activities.map((row) => ({
      id: row.id,
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
