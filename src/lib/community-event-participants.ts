import { buildAccountsOrderBy } from "@/lib/accounts-query";
import { broadcastChatParticipantsForUserIds } from "@/lib/chat-participants-broadcast";
import {
  isParticipantPermissions,
  isPlatformAdminPermissions,
} from "@/lib/member-access";
import { getProfileLabelForPermissions, getProfilePermissions } from "@/lib/permission-profiles";
import { prisma } from "@/lib/prisma";
import { serializeUserRow, userWithAccountInclude } from "@/lib/users";
import type { parsePaginationParams } from "@/lib/pagination";

export interface AvailableCommunityMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  permissionProfile: string;
  eventCount: number;
}

function buildAvailableParticipantSearchFilter(q: string | undefined) {
  if (!q) return {};
  return {
    OR: [
      { username: { contains: q, mode: "insensitive" as const } },
      { firstName: { contains: q, mode: "insensitive" as const } },
      { lastName: { contains: q, mode: "insensitive" as const } },
      { email: { contains: q, mode: "insensitive" as const } },
    ],
  };
}

export async function listAvailableCommunityParticipants(
  eventId: string,
  params: ReturnType<typeof parsePaginationParams>,
) {
  const where = {
    permissions: { equals: getProfilePermissions("participant") },
    users: { none: { eventId } },
    ...buildAvailableParticipantSearchFilter(params.q),
  };

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      orderBy: buildAccountsOrderBy(params.sortBy, params.sortOrder),
      skip: params.skip,
      take: params.limit,
      include: { _count: { select: { users: true } } },
    }),
    prisma.account.count({ where }),
  ]);

  const data: AvailableCommunityMember[] = accounts
    .filter((account) => !isPlatformAdminPermissions(account.permissions))
    .map((account) => ({
      id: account.id,
      email: account.email ?? "",
      firstName: account.firstName,
      lastName: account.lastName,
      username: account.username,
      permissionProfile: getProfileLabelForPermissions(account.permissions),
      eventCount: account._count.users,
    }));

  return { data, total };
}

export async function addCommunityMembersToEvent(eventId: string, accountIds: string[]) {
  const uniqueIds = [...new Set(accountIds)];
  if (uniqueIds.length === 0) {
    throw new Error("Select at least one community member");
  }

  const accounts = await prisma.account.findMany({
    where: { id: { in: uniqueIds } },
    include: { users: { where: { eventId }, select: { id: true } } },
  });

  if (accounts.length !== uniqueIds.length) {
    throw new Error("One or more members were not found");
  }

  for (const account of accounts) {
    if (isPlatformAdminPermissions(account.permissions)) {
      throw new Error(`${account.username} cannot be added as a participant`);
    }
    if (!isParticipantPermissions(account.permissions)) {
      throw new Error(`${account.username} is not a participant account`);
    }
    if (account.users.length > 0) {
      throw new Error(`${account.username} is already registered for this event`);
    }
  }

  const users = await prisma.$transaction(
    uniqueIds.map((accountId) =>
      prisma.user.create({
        data: { accountId, eventId },
        include: userWithAccountInclude,
      }),
    ),
  );

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } });
  if (event) {
    try {
      await broadcastChatParticipantsForUserIds(
        event.slug,
        eventId,
        users.map((user) => user.id),
      );
    } catch {
      // socket optional
    }
  }

  return users.map((user) => serializeUserRow(user));
}
