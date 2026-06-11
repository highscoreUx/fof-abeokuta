import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole, jsonError } from "@/lib/auth/middleware";
import { requireEventBySlug } from "@/lib/events";
import type { AccessTokenPayload, Role } from "@/types";

export async function requireEventContext(
  request: NextRequest,
  slug: string,
): Promise<{ event: Awaited<ReturnType<typeof requireEventBySlug>>; auth: AccessTokenPayload } | NextResponse> {
  try {
    const event = await requireEventBySlug(slug);
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.auth.eventId !== event.id || authResult.auth.eventSlug !== slug) {
      return jsonError("Event mismatch", "FORBIDDEN", 403);
    }

    return { event, auth: authResult.auth };
  } catch {
    return jsonError("Event not found", "NOT_FOUND", 404);
  }
}

export async function requireEventRole(
  request: NextRequest,
  slug: string,
  minimumRole: Role,
): Promise<{ event: Awaited<ReturnType<typeof requireEventBySlug>>; auth: AccessTokenPayload } | NextResponse> {
  const roleResult = requireRole(request, minimumRole);
  if (roleResult instanceof NextResponse) return roleResult;
  return requireEventContext(request, slug);
}
