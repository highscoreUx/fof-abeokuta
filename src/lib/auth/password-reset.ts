import { randomBytes } from "node:crypto";
import { hashToken } from "@/lib/auth/refresh";
import { prisma } from "@/lib/prisma";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export async function revokeAllRefreshTokensForAccount(accountId: string) {
  await prisma.refreshToken.updateMany({
    where: { accountId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function createPasswordResetToken(accountId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.updateMany({
    where: { accountId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: { accountId, tokenHash, expiresAt },
  });

  return rawToken;
}

export async function findValidPasswordResetAccountId(
  rawToken: string,
): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { accountId: true },
  });
  return record?.accountId ?? null;
}

export async function consumePasswordResetToken(rawToken: string): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) return null;

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.accountId;
}
