import { hashPassword } from "@/lib/auth/bcrypt";
import { generateStrongPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

export async function resetAccountPasswordForDelivery(accountId: string): Promise<string> {
  const password = generateStrongPassword();
  const passwordHash = await hashPassword(password);

  await prisma.account.update({
    where: { id: accountId },
    data: {
      passwordHash,
      mustChangePassword: true,
    },
  });

  return password;
}
