import { NextRequest, NextResponse } from "next/server";
import { verifyAccountAccessToken } from "@/lib/auth/account-jwt";
import { canAccessPlatform } from "@/lib/account-permissions";

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export function requirePlatformAuth(
  request: NextRequest,
): { auth: ReturnType<typeof verifyAccountAccessToken> } | NextResponse {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const auth = verifyAccountAccessToken(token);
    if (!canAccessPlatform(auth.permissions)) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }
    if (auth.mustChangePassword) {
      return NextResponse.json(
        { error: "Password change required", code: "PASSWORD_CHANGE_REQUIRED" },
        { status: 403 },
      );
    }
    return { auth };
  } catch {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
}
