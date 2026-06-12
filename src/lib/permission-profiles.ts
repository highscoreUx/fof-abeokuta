import {
  ALL_PERMISSIONS,
  normalizeRolePermissions,
  permissionsFingerprint,
  type Permission,
  type RolePermission,
} from "@/lib/permissions/catalog";
import {
  DEFAULT_EVENT_USER_ROLE_BUNDLES,
  type SystemEventUserRoleSlug,
} from "@/lib/permissions/default-bundles";

export const PERMISSION_PROFILES = DEFAULT_EVENT_USER_ROLE_BUNDLES;

export function getProfileBySlug(slug: string) {
  return PERMISSION_PROFILES.find((profile) => profile.slug === slug);
}

export function getProfilePermissions(slug: string): RolePermission[] {
  const profile = getProfileBySlug(slug);
  if (!profile) throw new Error(`Unknown permission profile: ${slug}`);
  return profile.permissions;
}

export function resolvePermissionsList(permissions: RolePermission[]): Permission[] {
  if (permissions.includes("*")) return [...ALL_PERMISSIONS];
  return permissions as Permission[];
}

export function getProfileLabelForPermissions(permissions: unknown): string {
  const normalized = normalizeRolePermissions(permissions);
  const fingerprint = permissionsFingerprint(normalized);
  for (const profile of PERMISSION_PROFILES) {
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
