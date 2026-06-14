import type { SystemEventUserRoleSlug } from "@/lib/permissions/default-bundles";

export const COMMUNITY_STAFF_PROFILE_SLUGS = [
  "event_admin",
  "coordinator",
  "staff",
  "judge",
  "official_photographer",
] as const satisfies readonly SystemEventUserRoleSlug[];

/** Roles assignable to a participant for this event only (not global account role). */
export const EVENT_SCOPED_STAFF_PROFILE_SLUGS = [
  "coordinator",
  "staff",
  "judge",
  "official_photographer",
] as const satisfies readonly SystemEventUserRoleSlug[];

export type CommunityAudience = "members" | "staff" | "participants";
