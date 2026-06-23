import { buildGlobalStaffAccountFilter, type GlobalMembersAudience } from "@/lib/member-access";
import { getProfilePermissions } from "@/lib/role-preset-cache";
import type { parsePaginationParams } from "@/lib/pagination";

const ACCOUNT_SORT_FIELDS = new Set(["firstName", "lastName", "username", "email", "createdAt"]);

export function buildAccountsWhere(
  params: ReturnType<typeof parsePaginationParams> & { audience?: GlobalMembersAudience },
) {
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
      parts.push({ id: "__none__" });
    }
  }

  if (params.audience === "staff") {
    parts.push(buildGlobalStaffAccountFilter());
  }

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { AND: parts };
}

export function buildAccountsOrderBy(sortBy: string, sortOrder: "asc" | "desc") {
  const field = ACCOUNT_SORT_FIELDS.has(sortBy) ? sortBy : "createdAt";
  return { [field]: sortOrder };
}
