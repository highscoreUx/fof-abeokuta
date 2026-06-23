import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findAccountByEmail, normalizeEmail } from "@/lib/accounts";
import { createPasswordResetToken } from "@/lib/auth/password-reset";
import { jsonError } from "@/lib/auth/middleware";
import { rateLimitAllow } from "@/lib/cache/index";
import { enqueueForgotPasswordEmail } from "@/server/queue/publish";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

const GENERIC_OK = {
  ok: true,
  message:
    "If an account exists with that email, we sent a link to reset your password. Check your inbox and spam folder.",
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid email", "VALIDATION_ERROR", 400);
  }

  const email = normalizeEmail(parsed.data.email);
  const allowed = await rateLimitAllow(`forgot-password:${email}`, 5, 900);
  if (!allowed) {
    return jsonError("Too many requests. Try again in a few minutes.", "RATE_LIMITED", 429);
  }

  const account = await findAccountByEmail(email);
  if (account?.email) {
    try {
      const rawToken = await createPasswordResetToken(account.id);
      enqueueForgotPasswordEmail({ accountId: account.id, rawToken });
    } catch (error) {
      console.error("[auth] forgot-password token creation failed:", error);
    }
  }

  return NextResponse.json(GENERIC_OK);
}
