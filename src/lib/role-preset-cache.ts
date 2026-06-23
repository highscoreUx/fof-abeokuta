import { canAccessPlatform } from "@/lib/account-permissions";
import {
  DEFAULT_EVENT_USER_ROLE_BUNDLES,
} from "@/lib/permissions/default-bundles";
import {
  hasWildcardAccess,
  normalizeRolePermissions,
  permissionsFingerprint,
  type Permission,
  type RolePermission,
} from "@/lib/permissions/catalog";
import type { PlatformRoleRow } from "@/lib/platform-roles.types";

let cachedProfiles: PlatformRoleRow[] | null = null;

function defaultProfiles(): PlatformRoleRow[] {
  return DEFAULT_EVENT_USER_ROLE_BUNDLES.map((bundle) => ({
    id: bundle.slug,
    slug: bundle.slug,
    name: bundle.name,
    permissions: bundle.permissions,
    permissionsVersion: 0,
    isSystem: bundle.isSystem,
  }));
}

export function setRolePresetCache(profiles: PlatformRoleRow[]) {
  cachedProfiles = profiles;
}

export function clearRolePresetCache() {
  cachedProfiles = null;
}

export function getCachedPermissionProfiles(): PlatformRoleRow[] {
  return cachedProfiles ?? defaultProfiles();
}

export function getProfileBySlug(slug: string) {
  return getCachedPermissionProfiles().find((profile) => profile.slug === slug);
}

export function getProfilePermissions(slug: string): RolePermission[] {
  const profile = getProfileBySlug(slug);
  if (!profile) throw new Error(`Unknown permission profile: ${slug}`);
  return profile.permissions;
}

export function getProfileLabelForPermissions(permissions: unknown): string {
  const normalized = normalizeRolePermissions(permissions);
  if (hasWildcardAccess(normalized) || canAccessPlatform(normalized)) {
    return "Platform admin";
  }
  const fingerprint = permissionsFingerprint(normalized);
  for (const profile of getCachedPermissionProfiles()) {
    if (permissionsFingerprint(profile.permissions) === fingerprint) {
      return profile.name;
    }
  }
  if (normalized.includes("*")) return "Full access";
  return "Custom";
}

export function resolveMemberProfileSlug(permissions: unknown): string {
  const normalized = normalizeRolePermissions(permissions);
  if (hasWildcardAccess(normalized) || canAccessPlatform(normalized)) {
    return "platform_admin";
  }
  const fingerprint = permissionsFingerprint(normalized);
  for (const profile of getCachedPermissionProfiles()) {
    if (permissionsFingerprint(profile.permissions) === fingerprint) {
      return profile.slug;
    }
  }
  return "custom";
}

export function permissionsMatchPreset(permissions: unknown, preset: RolePermission[]): boolean {
  return permissionsFingerprint(normalizeRolePermissions(permissions)) === permissionsFingerprint(preset);
}

export function participantPermissions(): RolePermission[] {
  return getProfilePermissions("participant");
}

export function isParticipantPermissions(permissions: unknown): boolean {
  return permissionsMatchPreset(permissions, participantPermissions());
}
