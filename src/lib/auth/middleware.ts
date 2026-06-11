import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { hasMinimumRole } from "@/lib/permissions";
import type { AccessTokenPayload, Role } from "@/types";

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export function authenticateRequest(request: NextRequest): AccessTokenPayload | null {
  const token = getBearerToken(request);
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export function requireAuth(
  request: NextRequest,
): { auth: AccessTokenPayload } | NextResponse {
  const auth = authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  return { auth };
}

export function requireRole(
  request: NextRequest,
  minimumRole: Role,
): { auth: AccessTokenPayload } | NextResponse {
  const result = requireAuth(request);
  if (result instanceof NextResponse) return result;

  if (!hasMinimumRole(result.auth.role, minimumRole)) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  return result;
}

export function jsonError(message: string, code: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}
