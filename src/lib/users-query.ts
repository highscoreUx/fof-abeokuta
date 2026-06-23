import { Prisma } from "@/generated/prisma/client";
import {
  COMMUNITY_STAFF_PROFILE_SLUGS,
  type CommunityAudience,
} from "@/lib/community-audience";
import { getProfilePermissions } from "@/lib/role-preset-cache";
import { parsePaginationParams } from "@/lib/pagination";

const USER_SORT_FIELDS = new Set(["createdAt", "checkedInAt"]);
const ACCOUNT_SORT_FIELDS = new Set(["firstName", "lastName", "username", "email"]);

function buildCommunityStaffAccountFilter() {
  return {
    OR: COMMUNITY_STAFF_PROFILE_SLUGS.map((slug) => ({
      permissions: { equals: getProfilePermissions(slug) },
    })),
  };
}

function buildCommunityParticipantAccountFilter() {
  return {
    permissions: { equals: getProfilePermissions("participant") },
  };
}

function staffPermissionEqualsFilters() {
  return COMMUNITY_STAFF_PROFILE_SLUGS.map((slug) => ({
    permissions: { equals: getProfilePermissions(slug) },
  }));
}

/** Event users who effectively have staff access (account role or event override). */
function buildEventStaffUserFilter() {
  return {
    OR: [
      { account: buildCommunityStaffAccountFilter() },
      ...staffPermissionEqualsFilters(),
    ],
  };
}

/** Event users who effectively remain participants for this event. */
function buildEventParticipantUserFilter() {
  return {
    AND: [
      { account: buildCommunityParticipantAccountFilter() },
      {
        OR: [
          { permissions: { equals: Prisma.DbNull } },
          { permissions: { equals: getProfilePermissions("participant") } },
        ],
      },
    ],
  };
}

function buildAccountSearchFilter(params: ReturnType<typeof parsePaginationParams>) {
  if (!params.q) return {};
  return {
    account: {
      OR: [
        { username: { contains: params.q, mode: "insensitive" as const } },
        { firstName: { contains: params.q, mode: "insensitive" as const } },
        { lastName: { contains: params.q, mode: "insensitive" as const } },
        { email: { contains: params.q, mode: "insensitive" as const } },
      ],
    },
  };
}

function buildUserRoleFilter(params: ReturnType<typeof parsePaginationParams>) {
  if (!params.role) return {};
  try {
    const permissions = getProfilePermissions(params.role);
    return {
      OR: [
        { permissions: { equals: permissions } },
        { account: { permissions: { equals: permissions } } },
      ],
    };
  } catch {
    return { id: "__none__" };
  }
}

export function buildUsersWhere(
  eventId: string,
  params: ReturnType<typeof parsePaginationParams> & { audience?: CommunityAudience },
) {
  const audienceFilter =
    params.audience === "staff"
      ? buildEventStaffUserFilter()
      : params.audience === "participants"
        ? buildEventParticipantUserFilter()
        : {};

  return {
    eventId,
    ...buildUserRoleFilter(params),
    ...audienceFilter,
    ...buildAccountSearchFilter(params),
    ...(params.teamId ? { teamId: params.teamId } : {}),
    ...(params.checkedIn === "yes" ? { checkedInAt: { not: null } } : {}),
    ...(params.checkedIn === "no" ? { checkedInAt: null } : {}),
  };
}

export function buildUsersOrderBy(sortBy: string, sortOrder: "asc" | "desc") {
  if (ACCOUNT_SORT_FIELDS.has(sortBy)) {
    return { account: { [sortBy]: sortOrder } };
  }
  const field = USER_SORT_FIELDS.has(sortBy) ? sortBy : "createdAt";
  return { [field]: sortOrder };
}
