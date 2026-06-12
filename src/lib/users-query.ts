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

export function buildUsersWhere(
  eventId: string,
  params: ReturnType<typeof parsePaginationParams>,
) {
  return {
    eventId,
    ...(params.teamId ? { teamId: params.teamId } : {}),
    ...(params.checkedIn === "yes" ? { checkedInAt: { not: null } } : {}),
    ...(params.checkedIn === "no" ? { checkedInAt: null } : {}),
    ...buildAccountFilter(params),
  };
}

export function buildUsersOrderBy(sortBy: string, sortOrder: "asc" | "desc") {
  if (ACCOUNT_SORT_FIELDS.has(sortBy)) {
    return { account: { [sortBy]: sortOrder } };
  }
  const field = USER_SORT_FIELDS.has(sortBy) ? sortBy : "createdAt";
  return { [field]: sortOrder };
}
