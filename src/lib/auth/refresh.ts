import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { signRefreshToken } from "@/lib/auth/jwt";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createRefreshToken(payload: {
  accountId: string;
  userId?: string;
  eventId?: string;
}) {
  const token = signRefreshToken(payload);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      accountId: payload.accountId,
      userId: payload.userId ?? null,
      tokenHash,
      expiresAt,
    },
  });

  return token;
}

export async function rotateRefreshToken(
  oldToken: string,
  payload: { accountId: string; userId?: string; eventId?: string },
) {
  const oldHash = hashToken(oldToken);

  await prisma.refreshToken.updateMany({
    where: { tokenHash: oldHash, accountId: payload.accountId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return createRefreshToken(payload);
}

export async function revokeRefreshToken(token: string) {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function isRefreshTokenValid(token: string, accountId: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      accountId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  return Boolean(record);
}
