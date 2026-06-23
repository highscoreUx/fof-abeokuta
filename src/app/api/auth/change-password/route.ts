import { NextRequest, NextResponse } from "next/server";
import { changeAccountPassword } from "@/lib/accounts";
import { changePasswordBodySchema } from "@/lib/auth/password-policy";
import { verifyAccountAccessToken } from "@/lib/auth/account-jwt";
import { getBearerToken, jsonError } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  let accountId: string;
  try {
    ({ accountId } = verifyAccountAccessToken(token));
  } catch {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const body = await request.json();
  const parsed = changePasswordBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid password", "VALIDATION_ERROR", 400);
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) {
    return jsonError("Account not found", "NOT_FOUND", 404);
  }

  if (!account.mustChangePassword && parsed.data.currentPassword) {
    const { verifyPassword } = await import("@/lib/auth/bcrypt");
    if (!(await verifyPassword(parsed.data.currentPassword, account.passwordHash))) {
      return jsonError("Current password is incorrect", "INVALID_CREDENTIALS", 401);
    }
  } else if (!account.mustChangePassword && !parsed.data.currentPassword) {
    return jsonError("Current password is required", "VALIDATION_ERROR", 400);
  }

  await changeAccountPassword(accountId, parsed.data.newPassword);

  return NextResponse.json({ ok: true });
}
