import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/bcrypt";
import { generateStrongPassword } from "@/lib/auth/password";
import type { RolePermission } from "@/lib/permissions/catalog";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function findAccountByEmail(email: string) {
  return prisma.account.findUnique({
    where: { email: normalizeEmail(email) },
  });
}

export async function authenticateAccount(email: string, password: string) {
  const account = await findAccountByEmail(email);
  if (!account) return null;
  if (!(await verifyPassword(password, account.passwordHash))) return null;
  return account;
}

export async function createAccount(data: {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  password?: string;
  mustChangePassword?: boolean;
  permissions?: RolePermission[];
  globalMember?: boolean;
}) {
  const email = normalizeEmail(data.email);
  const username = normalizeUsername(data.username);

  const [emailTaken, usernameTaken] = await Promise.all([
    prisma.account.findUnique({ where: { email } }),
    prisma.account.findUnique({ where: { username } }),
  ]);

  if (emailTaken) throw new Error("Email is already registered");
  if (usernameTaken) throw new Error("Username is already taken");

  const password = data.password ?? generateStrongPassword();
  const passwordHash = await hashPassword(password);

  const account = await prisma.account.create({
    data: {
      email,
      username,
      passwordHash,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      middleName: data.middleName?.trim() || null,
      mustChangePassword: data.mustChangePassword ?? true,
      permissions: data.permissions ?? [],
      globalMember: data.globalMember ?? false,
    },
  });

  return { account, initialPassword: password };
}

export async function changeAccountPassword(accountId: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  return prisma.account.update({
    where: { id: accountId },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });
}

export async function updateAccount(
  accountId: string,
  data: {
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string | null;
    permissions?: RolePermission[];
  },
) {
  const updates: {
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    middleName?: string | null;
    permissions?: RolePermission[];
    permissionsVersion?: { increment: number };
  } = {};

  if (data.email !== undefined) updates.email = normalizeEmail(data.email);
  if (data.username !== undefined) updates.username = normalizeUsername(data.username);
  if (data.firstName !== undefined) updates.firstName = data.firstName.trim();
  if (data.lastName !== undefined) updates.lastName = data.lastName.trim();
  if (data.middleName !== undefined) updates.middleName = data.middleName?.trim() || null;
  if (data.permissions !== undefined) {
    updates.permissions = data.permissions;
    updates.permissionsVersion = { increment: 1 };
  }

  if (updates.email) {
    const taken = await prisma.account.findFirst({
      where: { email: updates.email, NOT: { id: accountId } },
    });
    if (taken) throw new Error("Email is already registered");
  }

  if (updates.username) {
    const taken = await prisma.account.findFirst({
      where: { username: updates.username, NOT: { id: accountId } },
    });
    if (taken) throw new Error("Username is already taken");
  }

  return prisma.account.update({
    where: { id: accountId },
    data: updates,
  });
}
