import type { Prisma } from "@/generated/prisma/client";

export const userWithAccountInclude = {
  account: true,
  team: true,
} satisfies Prisma.UserInclude;

export type UserWithAccount = Prisma.UserGetPayload<{
  include: typeof userWithAccountInclude;
}>;

export function pickUserProfile(user: UserWithAccount) {
  return {
    username: user.account.username,
    email: user.account.email,
    firstName: user.account.firstName,
    lastName: user.account.lastName,
    middleName: user.account.middleName,
    maskedEmail: user.account.maskedEmail,
  };
}
