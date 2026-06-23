import {
  resolvePermissionsList,
} from "@/lib/permissions/catalog";
import {
  DEFAULT_EVENT_USER_ROLE_BUNDLES,
  type SystemEventUserRoleSlug,
} from "@/lib/permissions/default-bundles";

export { resolvePermissionsList };

/** @deprecated Prefer `getCachedPermissionProfiles()` or `/api/fg-admin/roles` on the client. */
export const PERMISSION_PROFILES = DEFAULT_EVENT_USER_ROLE_BUNDLES;

import {
  getCachedPermissionProfiles,
  getProfileBySlug,
  getProfileLabelForPermissions,
  getProfilePermissions,
  resolveMemberProfileSlug,
} from "@/lib/role-preset-cache";

export {
  getCachedPermissionProfiles,
  getProfileBySlug,
  getProfileLabelForPermissions,
  getProfilePermissions,
  resolveMemberProfileSlug,
};

export function getPermissionProfiles() {
  return getCachedPermissionProfiles();
}

export function legacyRoleToProfileSlug(role: string): SystemEventUserRoleSlug {
  const map: Record<string, SystemEventUserRoleSlug> = {
    ADMIN: "event_admin",
    STAFF: "staff",
    JUDGE: "judge",
    PARTICIPANT: "participant",
  };
  return map[role.toUpperCase()] ?? "participant";
}
