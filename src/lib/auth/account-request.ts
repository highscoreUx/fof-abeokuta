import type { NextRequest } from "next/server";
import { verifyAccountAccessToken } from "@/lib/auth/account-jwt";

export function authenticateAccountRequest(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return verifyAccountAccessToken(header.slice(7));
  } catch {
    return null;
  }
}
