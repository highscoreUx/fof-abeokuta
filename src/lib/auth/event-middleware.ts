import { NextRequest, NextResponse } from "next/server";
import { authenticateAccountRequest } from "@/lib/auth/account-request";
import { resolveEventMembership } from "@/lib/auth/event-access";
import { requireAuth, requirePermission, jsonError } from "@/lib/auth/middleware";
import { loadSessionAuthContext, assertSessionVersions } from "@/lib/auth/session";
import { requireEventBySlug } from "@/lib/events";
import { hasPermission } from "@/lib/permissions";
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

async function resolveAuthForEvent(request: NextRequest, slug: string) {
  const accountAuth = authenticateAccountRequest(request);
  if (accountAuth) {
    const membership = await resolveEventMembership(accountAuth.accountId, slug);
    if (membership.status === "EVENT_NOT_FOUND") {
      return jsonError("Event not found", "NOT_FOUND", 404);
    }
    if (membership.status === "NOT_REGISTERED") {
      return jsonError("Not registered for this event", "NOT_REGISTERED", 403);
    }
    if (membership.status === "CHECK_IN_REQUIRED") {
      return jsonError(
        "You must check in with staff before signing in.",
        "CHECK_IN_REQUIRED",
        403,
      );
    }
    return membership.auth;
  }

  const authResult = requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  return authResult.auth;
}

export async function requireEventContext(
  request: NextRequest,
  slug: string,
): Promise<{ event: Awaited<ReturnType<typeof requireEventBySlug>>; auth: AccessTokenPayload } | NextResponse> {
  try {
    const event = await requireEventBySlug(slug);
    const auth = await resolveAuthForEvent(request, slug);
    if (auth instanceof NextResponse) return auth;

    if (auth.eventId !== event.id || auth.eventSlug !== slug) {
      return jsonError("Event mismatch", "FORBIDDEN", 403);
    }

    const stale = await assertFreshSession(auth);
    if (stale) return stale;

    return { event, auth };
  } catch {
    return jsonError("Event not found", "NOT_FOUND", 404);
  }
}

export async function requireEventPermission(
  request: NextRequest,
  slug: string,
  permission: Permission,
): Promise<{ event: Awaited<ReturnType<typeof requireEventBySlug>>; auth: AccessTokenPayload } | NextResponse> {
  const accountAuth = authenticateAccountRequest(request);
  if (accountAuth) {
    const ctx = await requireEventContext(request, slug);
    if (ctx instanceof NextResponse) return ctx;
    if (!hasPermission(ctx.auth.permissions, permission)) {
      return jsonError("Forbidden", "FORBIDDEN", 403);
    }
    return ctx;
  }

  const permissionResult = requirePermission(request, permission);
  if (permissionResult instanceof NextResponse) return permissionResult;
  return requireEventContext(request, slug);
}
