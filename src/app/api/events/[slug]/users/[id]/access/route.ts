import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { EVENT_SCOPED_STAFF_PROFILE_SLUGS } from "@/lib/community-audience";
import { EventUserAccessError, updateEventUserAccess } from "@/lib/event-user-access";

const assignableSlugs = [...EVENT_SCOPED_STAFF_PROFILE_SLUGS, "participant"] as const;

const updateAccessSchema = z.object({
  permissionProfile: z.enum(assignableSlugs),
  email: z.string().email().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: userId } = await params;
  const ctx = await requireEventPermission(request, slug, "user.update");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = updateAccessSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  try {
    const result = await updateEventUserAccess({
      eventId: ctx.event.id,
      userId,
      permissionProfile: parsed.data.permissionProfile,
      email: parsed.data.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof EventUserAccessError) {
      const status = error.code === "NOT_FOUND" ? 404 : 400;
      return jsonError(error.message, error.code, status);
    }
    throw error;
  }
}
