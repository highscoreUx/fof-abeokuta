import {
  buildCommunityParticipantAccountFilter,
  buildCommunityStaffAccountFilter,
  type CommunityAudience,
} from "@/lib/community-audience";
import { getProfilePermissions } from "@/lib/permission-profiles";
import { parsePaginationParams } from "@/lib/pagination";

const USER_SORT_FIELDS = new Set(["createdAt", "checkedInAt"]);
const ACCOUNT_SORT_FIELDS = new Set(["firstName", "lastName", "username", "email"]);

function buildAccountFilter(params: ReturnType<typeof parsePaginationParams>) {
  const parts: Record<string, unknown>[] = [];

  if (params.q) {
    parts.push({
      OR: [
        { username: { contains: params.q, mode: "insensitive" as const } },
        { firstName: { contains: params.q, mode: "insensitive" as const } },
        { lastName: { contains: params.q, mode: "insensitive" as const } },
        { email: { contains: params.q, mode: "insensitive" as const } },
      ],
    });
  }

  if (params.role) {
    try {
      parts.push({ permissions: { equals: getProfilePermissions(params.role) } });
    } catch {
      // Unknown profile slug — no matches.
      parts.push({ id: "__none__" });
    }
  }

  if (parts.length === 0) return {};
  if (parts.length === 1) return { account: parts[0] };
  return { account: { AND: parts } };
}

function mergeAccountFilters(
  ...filters: Array<Record<string, unknown> | undefined>
): Record<string, unknown> | undefined {
  const parts = filters.filter((filter) => filter && Object.keys(filter).length > 0) as Record<
    string,
    unknown
  >[];
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return { AND: parts };
}

export function buildUsersWhere(
  eventId: string,
  params: ReturnType<typeof parsePaginationParams> & { audience?: CommunityAudience },
) {
  const accountFromSearch = buildAccountFilter(params);
  const audienceFilter =
    params.audience === "staff"
      ? { account: buildCommunityStaffAccountFilter() }
      : params.audience === "participants"
        ? { account: buildCommunityParticipantAccountFilter() }
        : undefined;
  const searchAccount = accountFromSearch.account as Record<string, unknown> | undefined;
  const audienceAccount =
    audienceFilter?.account as Record<string, unknown> | undefined;
  const mergedAccount = mergeAccountFilters(searchAccount, audienceAccount);

  return {
    eventId,
    ...(params.teamId ? { teamId: params.teamId } : {}),
    ...(params.checkedIn === "yes" ? { checkedInAt: { not: null } } : {}),
    ...(params.checkedIn === "no" ? { checkedInAt: null } : {}),
    ...(mergedAccount ? { account: mergedAccount } : {}),
  };
}

export function buildUsersOrderBy(sortBy: string, sortOrder: "asc" | "desc") {
  if (ACCOUNT_SORT_FIELDS.has(sortBy)) {
    return { account: { [sortBy]: sortOrder } };
  }
  const field = USER_SORT_FIELDS.has(sortBy) ? sortBy : "createdAt";
  return { [field]: sortOrder };
}
