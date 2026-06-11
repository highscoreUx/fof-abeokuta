import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/auth/bcrypt";
import { signPlatformAccessToken } from "@/lib/platform-auth/jwt";
import { createPlatformRefreshToken } from "@/lib/platform-auth/refresh";
import {
  getPlatformRefreshCookieOptions,
  PLATFORM_REFRESH_COOKIE,
} from "@/lib/platform-auth/cookies";
import { jsonError } from "@/lib/auth/middleware";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid email or password", "VALIDATION_ERROR", 400);
  }

  const admin = await prisma.platformAdmin.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!admin || !(await verifyPin(parsed.data.password, admin.passwordHash))) {
    return jsonError("Invalid email or password", "INVALID_CREDENTIALS", 401);
  }

  const accessToken = signPlatformAccessToken({
    adminId: admin.id,
    email: admin.email,
  });

  const refreshToken = await createPlatformRefreshToken(admin.id);

  const response = NextResponse.json({
    accessToken,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });

  response.cookies.set(PLATFORM_REFRESH_COOKIE, refreshToken, getPlatformRefreshCookieOptions());

  return response;
}
