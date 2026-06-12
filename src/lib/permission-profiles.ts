import {
  normalizeRolePermissions,
  permissionsFingerprint,
  resolvePermissionsList,
  type Permission,
  type RolePermission,
} from "@/lib/permissions/catalog";
import {
  DEFAULT_EVENT_USER_ROLE_BUNDLES,
  type SystemEventUserRoleSlug,
} from "@/lib/permissions/default-bundles";

export { resolvePermissionsList };

/** @deprecated Prefer fetching roles from `/api/fg-admin/roles` on the client. */
export const PERMISSION_PROFILES = DEFAULT_EVENT_USER_ROLE_BUNDLES;

function defaultProfiles() {
  return DEFAULT_EVENT_USER_ROLE_BUNDLES.map((bundle) => ({
    id: bundle.slug,
    slug: bundle.slug,
    name: bundle.name,
    permissions: bundle.permissions,
    permissionsVersion: 0,
    isSystem: bundle.isSystem,
  }));
}

export function getPermissionProfiles() {
  return defaultProfiles();
}

export function getProfileBySlug(slug: string) {
  return DEFAULT_EVENT_USER_ROLE_BUNDLES.find((profile) => profile.slug === slug);
}

export function getProfilePermissions(slug: string): RolePermission[] {
  const profile = getProfileBySlug(slug);
  if (!profile) throw new Error(`Unknown permission profile: ${slug}`);
  return profile.permissions;
}

export function getProfileLabelForPermissions(permissions: unknown): string {
  const normalized = normalizeRolePermissions(permissions);
  const fingerprint = permissionsFingerprint(normalized);
  for (const profile of DEFAULT_EVENT_USER_ROLE_BUNDLES) {
    if (permissionsFingerprint(profile.permissions) === fingerprint) {
      return profile.name;
    }
  }
  if (normalized.includes("*")) return "Full access";
  return "Custom";
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
