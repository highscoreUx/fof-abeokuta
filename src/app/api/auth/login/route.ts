import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LoginError, loginAccount } from "@/lib/auth/login-service";
import { setRefreshCookie } from "@/lib/auth/cookies";
import { jsonError } from "@/lib/auth/middleware";
import { rateLimitAllow } from "@/lib/cache/index";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid credentials", "VALIDATION_ERROR", 400);
  }

  const email = parsed.data.email.trim().toLowerCase();
  const allowed = await rateLimitAllow(`login:${email}`, 15, 300);
  if (!allowed) {
    return jsonError("Too many login attempts. Try again in a few minutes.", "RATE_LIMITED", 429);
  }

  try {
    const result = await loginAccount(parsed.data.email, parsed.data.password);

    if (result.mustChangePassword) {
      return NextResponse.json({
        mustChangePassword: true,
        accountAccessToken: result.accountAccessToken,
        account: result.account,
      });
    }

    const response = NextResponse.json({
      accessToken: result.accessToken,
      account: result.account,
    });
    setRefreshCookie(response, result.refreshToken);
    return response;
  } catch (error) {
    if (error instanceof LoginError) {
      return jsonError(error.message, error.code, error.status);
    }
    return jsonError("Login failed", "LOGIN_FAILED", 500);
  }
}
