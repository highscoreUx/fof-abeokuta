import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAccessToken } from "@/lib/platform-auth/jwt";

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export function requirePlatformAuth(
  request: NextRequest,
): { auth: ReturnType<typeof verifyPlatformAccessToken> } | NextResponse {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    return { auth: verifyPlatformAccessToken(token) };
  } catch {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
}
