import { getProfilePermissions } from "@/lib/permission-profiles";
import type { SystemEventUserRoleSlug } from "@/lib/permissions/default-bundles";

export const COMMUNITY_STAFF_PROFILE_SLUGS = [
  "event_admin",
  "coordinator",
  "staff",
  "judge",
] as const satisfies readonly SystemEventUserRoleSlug[];

export type CommunityAudience = "members" | "staff";

export function buildCommunityStaffAccountFilter() {
  return {
    OR: COMMUNITY_STAFF_PROFILE_SLUGS.map((slug) => ({
      permissions: { equals: getProfilePermissions(slug) },
    })),
  };
}
