export interface ListQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  role?: string;
  checkedIn?: "yes" | "no";
  teamId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "10", 10) || 10),
  );
  const q = searchParams.get("q")?.trim() || undefined;
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder: "asc" | "desc" = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const role = searchParams.get("role") || undefined;
  const checkedIn = searchParams.get("checkedIn") === "yes"
    ? "yes"
    : searchParams.get("checkedIn") === "no"
      ? "no"
      : undefined;
  const teamId = searchParams.get("teamId") || undefined;

  return { page, limit, q, sortBy, sortOrder, role, checkedIn, teamId, skip: (page - 1) * limit };
}

export function toPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
