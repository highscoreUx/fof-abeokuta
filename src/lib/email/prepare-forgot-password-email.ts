import { getAppBaseUrl } from "@/lib/email/config";
import { buildForgotPasswordEmail } from "@/lib/email/templates/forgot-password";
import type { PreparedEmail } from "@/lib/email/prepared-email";
import { prisma } from "@/lib/prisma";

export async function prepareForgotPasswordEmail(
  accountId: string,
  rawToken: string,
): Promise<PreparedEmail | null> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  const email = account.email?.trim();
  if (!email) {
    return null;
  }

  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const { subject, html, text } = buildForgotPasswordEmail({
    firstName: account.firstName,
    resetUrl,
  });

  return {
    to: email,
    subject,
    html,
    text,
    meta: { kind: "forgot_password" },
  };
}
