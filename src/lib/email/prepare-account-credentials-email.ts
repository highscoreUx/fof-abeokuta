import { getAppBaseUrl } from "@/lib/email/config";
import {
  buildAccountCredentialsEmail,
  type AccountCredentialsReason,
} from "@/lib/email/templates/account-credentials";
import type { PreparedEmail } from "@/lib/email/prepared-email";
import { prisma } from "@/lib/prisma";

export async function prepareAccountCredentialsEmail(
  accountId: string,
  password: string,
  options: {
    reason: AccountCredentialsReason;
    loginPath?: string;
  },
): Promise<PreparedEmail | null> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  const email = account.email?.trim();
  if (!email) {
    console.info(`[email] Skipping credentials email for account ${accountId}: no email`);
    return null;
  }

  const loginPath = options.loginPath ?? "/login";
  const loginUrl = `${getAppBaseUrl()}${loginPath.startsWith("/") ? loginPath : `/${loginPath}`}`;

  const { subject, html, text } = buildAccountCredentialsEmail({
    firstName: account.firstName,
    email,
    username: account.username,
    password,
    loginUrl,
    reason: options.reason,
  });

  return {
    to: email,
    subject,
    html,
    text,
    meta: { kind: "account_credentials", reason: options.reason },
  };
}
