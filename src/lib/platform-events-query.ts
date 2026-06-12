import type { Prisma } from "@/generated/prisma/client";

export type PlatformEventsSortField = "date" | "title" | "status" | "createdAt";

const SORT_FIELDS = new Set<PlatformEventsSortField>(["date", "title", "status", "createdAt"]);

export function buildPlatformEventsWhere(
  q?: string,
  status?: string,
): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = {};

  if (status && status !== "all") {
    where.status = status as Prisma.EnumEventStatusFilter["equals"];
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
}

export function buildPlatformEventsOrderBy(
  sortBy?: string,
  sortOrder?: "asc" | "desc",
): Prisma.EventOrderByWithRelationInput {
  const field = SORT_FIELDS.has(sortBy as PlatformEventsSortField)
    ? (sortBy as PlatformEventsSortField)
    : "date";
  const order = sortOrder === "asc" ? "asc" : "desc";
  return { [field]: order };
}
