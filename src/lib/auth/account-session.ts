import { verifyRefreshToken } from "@/lib/auth/jwt";
import { signAccountAccessToken } from "@/lib/auth/account-jwt";
import { accountAccessTokenFields } from "@/lib/account-permissions";
import { isRefreshTokenValid, rotateRefreshToken } from "@/lib/auth/refresh";
import { prisma } from "@/lib/prisma";
import { serializeAccount } from "@/lib/users";

export class AccountSessionRefreshError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 401,
  ) {
    super(message);
    this.name = "AccountSessionRefreshError";
  }
}

export async function refreshAccountSession(refreshToken: string) {
  let accountId: string;
  try {
    ({ accountId } = verifyRefreshToken(refreshToken));
  } catch {
    throw new AccountSessionRefreshError("Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }

  const valid = await isRefreshTokenValid(refreshToken, accountId);
  if (!valid) {
    throw new AccountSessionRefreshError(
      "Refresh token revoked or expired",
      "REFRESH_EXPIRED",
    );
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) {
    throw new AccountSessionRefreshError("Account not found", "ACCOUNT_NOT_FOUND");
  }

  if (account.mustChangePassword) {
    throw new AccountSessionRefreshError(
      "Password change required",
      "PASSWORD_CHANGE_REQUIRED",
      403,
    );
  }

  const newRefreshToken = await rotateRefreshToken(refreshToken, { accountId });
  const accessToken = signAccountAccessToken(accountAccessTokenFields(account));

  return {
    accessToken,
    refreshToken: newRefreshToken,
    account: serializeAccount(account),
  };
}
