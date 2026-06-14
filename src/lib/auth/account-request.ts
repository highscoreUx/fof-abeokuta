import type { NextRequest } from "next/server";
import { getBearerToken } from "@/lib/auth/middleware";
import { verifyAccountAccessToken } from "@/lib/auth/account-jwt";

export function authenticateAccountRequest(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return null;
  try {
    return verifyAccountAccessToken(token);
  } catch {
    return null;
  }
}
