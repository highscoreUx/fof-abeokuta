import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { changeAccountPassword } from "@/lib/accounts";
import { verifyAccountAccessToken } from "@/lib/auth/account-jwt";
import { getBearerToken, jsonError } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/[a-z]/, "Include a lowercase letter")
    .regex(/[0-9]/, "Include a number"),
});

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
  const parsed = schema.safeParse(body);
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
