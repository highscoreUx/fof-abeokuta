import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { signPlatformRefreshToken } from "@/lib/platform-auth/jwt";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPlatformRefreshToken(adminId: string) {
  const token = signPlatformRefreshToken(adminId);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.platformRefreshToken.create({
    data: { adminId, tokenHash, expiresAt },
  });

  return token;
}

export async function rotatePlatformRefreshToken(oldToken: string, adminId: string) {
  const oldHash = hashToken(oldToken);
  await prisma.platformRefreshToken.updateMany({
    where: { tokenHash: oldHash, adminId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return createPlatformRefreshToken(adminId);
}

export async function revokePlatformRefreshToken(token: string) {
  const tokenHash = hashToken(token);
  await prisma.platformRefreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function isPlatformRefreshTokenValid(token: string, adminId: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.platformRefreshToken.findFirst({
    where: {
      tokenHash,
      adminId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  return Boolean(record);
}
