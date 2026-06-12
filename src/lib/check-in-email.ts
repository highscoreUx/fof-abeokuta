import { normalizeEmail, updateAccount } from "@/lib/accounts";
import { prisma } from "@/lib/prisma";

export class CheckInEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckInEmailError";
  }
}

export async function resolveEmailForCheckIn(accountId: string, email?: string): Promise<string> {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });

  if (account.email) {
    return account.email;
  }

  const trimmed = email?.trim();
  if (!trimmed) {
    throw new CheckInEmailError("Email is required before check-in");
  }

  const normalized = normalizeEmail(trimmed);
  const taken = await prisma.account.findFirst({
    where: { email: normalized, NOT: { id: accountId } },
  });
  if (taken) {
    throw new CheckInEmailError("Email is already registered to another account");
  }

  const updated = await updateAccount(accountId, { email: normalized });
  return updated.email!;
}
