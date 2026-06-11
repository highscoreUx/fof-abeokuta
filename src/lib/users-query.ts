import { parsePaginationParams } from "@/lib/pagination";

const SORT_FIELDS = new Set([
  "firstName",
  "lastName",
  "username",
  "createdAt",
  "checkedInAt",
]);

export function buildUsersWhere(
  eventId: string,
  params: ReturnType<typeof parsePaginationParams>,
) {
  return {
    eventId,
    ...(params.role
      ? { eventUserRole: { slug: params.role } }
      : {}),
    ...(params.teamId ? { teamId: params.teamId } : {}),
    ...(params.checkedIn === "yes" ? { checkedInAt: { not: null } } : {}),
    ...(params.checkedIn === "no" ? { checkedInAt: null } : {}),
    ...(params.q
      ? {
          OR: [
            { username: { contains: params.q, mode: "insensitive" as const } },
            { firstName: { contains: params.q, mode: "insensitive" as const } },
            { lastName: { contains: params.q, mode: "insensitive" as const } },
            { email: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export function buildUsersOrderBy(sortBy: string, sortOrder: "asc" | "desc") {
  const field = SORT_FIELDS.has(sortBy) ? sortBy : "createdAt";
  return { [field]: sortOrder };
}
