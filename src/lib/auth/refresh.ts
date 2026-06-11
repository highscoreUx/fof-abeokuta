import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { signRefreshToken } from "@/lib/auth/jwt";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createRefreshToken(userId: string, eventId: string) {
  const token = signRefreshToken(userId, eventId);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
}

export async function rotateRefreshToken(oldToken: string, userId: string, eventId: string) {
  const oldHash = hashToken(oldToken);

  await prisma.refreshToken.updateMany({
    where: { tokenHash: oldHash, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return createRefreshToken(userId, eventId);
}

export async function revokeRefreshToken(token: string) {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function isRefreshTokenValid(token: string, userId: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  return Boolean(record);
}

export { hashPin } from "@/lib/auth/bcrypt";
