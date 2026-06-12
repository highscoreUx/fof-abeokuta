import { authenticateAccount } from "@/lib/accounts";
import { accountAccessTokenFields } from "@/lib/account-permissions";
import { signAccountAccessToken } from "@/lib/auth/account-jwt";
import { createRefreshToken } from "@/lib/auth/refresh";
import { serializeAccount } from "@/lib/users";

export class LoginError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 401,
  ) {
    super(message);
    this.name = "LoginError";
  }
}

/** Single sign-in: authenticate the account. Permissions decide what they can access. */
export async function loginAccount(email: string, password: string) {
  const account = await authenticateAccount(email, password);
  if (!account) {
    throw new LoginError("Invalid email or password", "INVALID_CREDENTIALS");
  }

  if (account.mustChangePassword) {
    return {
      mustChangePassword: true as const,
      accountAccessToken: signAccountAccessToken(accountAccessTokenFields(account)),
      account: serializeAccount(account),
    };
  }

  const refreshToken = await createRefreshToken({ accountId: account.id });
  const accessToken = signAccountAccessToken(accountAccessTokenFields(account));

  return {
    mustChangePassword: false as const,
    accessToken,
    refreshToken,
    account: serializeAccount(account),
  };
}
