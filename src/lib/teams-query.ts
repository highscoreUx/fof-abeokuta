import { parsePaginationParams } from "@/lib/pagination";

const SORT_FIELDS = new Set(["letter", "name", "memberCount"]);

export function buildTeamsWhere(
  eventId: string,
  params: ReturnType<typeof parsePaginationParams>,
) {
  return {
    eventId,
    ...(params.q
      ? {
          OR: [
            { letter: { contains: params.q, mode: "insensitive" as const } },
            { name: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export function buildTeamsOrderBy(sortBy: string, sortOrder: "asc" | "desc") {
  const field = SORT_FIELDS.has(sortBy) ? sortBy : "letter";
  if (field === "memberCount") {
    return { users: { _count: sortOrder } };
  }
  return { [field]: sortOrder };
}
