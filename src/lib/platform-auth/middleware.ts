import { NextRequest, NextResponse } from "next/server";
import { canAccessPlatform } from "@/lib/account-permissions";
import { verifyAccountAccessToken } from "@/lib/auth/account-jwt";
import { verifyAccessToken } from "@/lib/auth/jwt";
import type { Permission } from "@/lib/permissions/catalog";

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

function resolvePlatformPermissions(token: string): {
  permissions: Permission[];
  accountId: string;
  mustChangePassword: boolean;
} | null {
  try {
    const account = verifyAccountAccessToken(token);
    return {
      permissions: account.permissions,
      accountId: account.accountId,
      mustChangePassword: account.mustChangePassword,
    };
  } catch {
    try {
      const event = verifyAccessToken(token);
      return {
        permissions: event.permissions,
        accountId: event.accountId,
        mustChangePassword: false,
      };
    } catch {
      return null;
    }
  }
}

export function requirePlatformAuth(
  request: NextRequest,
): { auth: ReturnType<typeof verifyAccountAccessToken> } | NextResponse {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const resolved = resolvePlatformPermissions(token);
  if (!resolved || !canAccessPlatform(resolved.permissions)) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  if (resolved.mustChangePassword) {
    return NextResponse.json(
      { error: "Password change required", code: "PASSWORD_CHANGE_REQUIRED" },
      { status: 403 },
    );
  }

  return {
    auth: {
      accountId: resolved.accountId,
      email: "",
      username: "",
      permissions: resolved.permissions,
      permissionsFingerprint: "",
      accountPermissionsVersion: 0,
      mustChangePassword: false,
      type: "account" as const,
    },
  };
}
