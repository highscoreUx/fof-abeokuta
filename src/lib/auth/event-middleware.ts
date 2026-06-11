import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission, jsonError } from "@/lib/auth/middleware";
import { loadSessionAuthContext, assertSessionVersions } from "@/lib/auth/session";
import { requireEventBySlug } from "@/lib/events";
import type { AccessTokenPayload } from "@/types";
import type { Permission } from "@/lib/permissions/catalog";

async function assertFreshSession(
  auth: AccessTokenPayload,
): Promise<NextResponse | null> {
  const live = await loadSessionAuthContext(auth.userId);
  if (!live) {
    return jsonError("User not found", "UNAUTHORIZED", 401);
  }
  if (assertSessionVersions(auth, live) === "stale") {
    return jsonError("Session permissions are stale", "PERMISSIONS_STALE", 401);
  }
  return null;
}

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

    const stale = await assertFreshSession(authResult.auth);
    if (stale) return stale;

    return { event, auth: authResult.auth };
  } catch {
    return jsonError("Event not found", "NOT_FOUND", 404);
  }
}

export async function requireEventPermission(
  request: NextRequest,
  slug: string,
  permission: Permission,
): Promise<{ event: Awaited<ReturnType<typeof requireEventBySlug>>; auth: AccessTokenPayload } | NextResponse> {
  const permissionResult = requirePermission(request, permission);
  if (permissionResult instanceof NextResponse) return permissionResult;
  return requireEventContext(request, slug);
}
