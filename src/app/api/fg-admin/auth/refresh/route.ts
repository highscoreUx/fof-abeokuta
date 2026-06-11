import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPlatformRefreshToken, signPlatformAccessToken } from "@/lib/platform-auth/jwt";
import {
  getPlatformRefreshCookieOptions,
  getPlatformRefreshTokenFromCookies,
  PLATFORM_REFRESH_COOKIE,
} from "@/lib/platform-auth/cookies";
import {
  isPlatformRefreshTokenValid,
  rotatePlatformRefreshToken,
} from "@/lib/platform-auth/refresh";
import { jsonError } from "@/lib/auth/middleware";

export async function POST() {
  const refreshToken = await getPlatformRefreshTokenFromCookies();
  if (!refreshToken) {
    return jsonError("No refresh token", "NO_REFRESH_TOKEN", 401);
  }

  let adminId: string;
  try {
    ({ adminId } = verifyPlatformRefreshToken(refreshToken));
  } catch {
    return jsonError("Invalid refresh token", "INVALID_REFRESH_TOKEN", 401);
  }

  const valid = await isPlatformRefreshTokenValid(refreshToken, adminId);
  if (!valid) {
    return jsonError("Refresh token revoked or expired", "REFRESH_EXPIRED", 401);
  }

  const admin = await prisma.platformAdmin.findUnique({ where: { id: adminId } });
  if (!admin) {
    return jsonError("Admin not found", "NOT_FOUND", 401);
  }

  const newRefreshToken = await rotatePlatformRefreshToken(refreshToken, adminId);
  const accessToken = signPlatformAccessToken({
    adminId: admin.id,
    email: admin.email,
  });

  const response = NextResponse.json({
    accessToken,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });

  response.cookies.set(PLATFORM_REFRESH_COOKIE, newRefreshToken, getPlatformRefreshCookieOptions());

  return response;
}
