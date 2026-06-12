import { canAccessPlatform } from "@/lib/account-permissions";
import { getProfilePermissions } from "@/lib/permission-profiles";
import {
  hasWildcardAccess,
  normalizeRolePermissions,
  permissionsFingerprint,
  type RolePermission,
} from "@/lib/permissions/catalog";

function asPermissions(permissions: unknown): RolePermission[] {
  return normalizeRolePermissions(permissions);
}

export const PARTICIPANT_PROFILE_SLUG = "participant";
export const PLATFORM_ADMIN_PROFILE_SLUG = "platform_admin";

const PARTICIPANT_PERMISSIONS_FINGERPRINT = permissionsFingerprint(
  getProfilePermissions(PARTICIPANT_PROFILE_SLUG),
);

export type GlobalMembersAudience = "all" | "staff";

export function parseGlobalMembersAudience(value: string | null): GlobalMembersAudience {
  return value === "staff" ? "staff" : "all";
}

export function isParticipantPermissions(permissions: unknown): boolean {
  const normalized = asPermissions(permissions);
  return permissionsFingerprint(normalized) === PARTICIPANT_PERMISSIONS_FINGERPRINT;
}

export function isPlatformAdminPermissions(permissions: unknown): boolean {
  const normalized = asPermissions(permissions);
  return hasWildcardAccess(normalized) || canAccessPlatform(normalized);
}

/** Platform admins and fg-admin global staff (non-participants) may access any event. */
export function hasGlobalEventAccess(account: {
  permissions: unknown;
  globalMember: boolean;
}): boolean {
  if (isPlatformAdminPermissions(account.permissions)) return true;
  if (!account.globalMember) return false;
  return !isParticipantPermissions(account.permissions);
}

/** Platform admin and participant accounts cannot be deleted. */
export function isLockedMemberAccount(permissions: unknown): boolean {
  return isPlatformAdminPermissions(permissions) || isParticipantPermissions(permissions);
}

export function buildGlobalStaffAccountFilter() {
  return {
    globalMember: true,
    NOT: {
      permissions: { equals: getProfilePermissions(PARTICIPANT_PROFILE_SLUG) },
    },
  };
}

export function resolveMemberProfileSlug(permissions: unknown): string {
  if (isPlatformAdminPermissions(permissions)) return PLATFORM_ADMIN_PROFILE_SLUG;
  const normalized = asPermissions(permissions);
  const fingerprint = permissionsFingerprint(normalized);
  const profiles = [
    "event_admin",
    "coordinator",
    "staff",
    "judge",
    PARTICIPANT_PROFILE_SLUG,
  ] as const;
  for (const slug of profiles) {
    if (fingerprint === permissionsFingerprint(getProfilePermissions(slug))) {
      return slug;
    }
  }
  return "custom";
}

export function permissionsForMemberProfileSlug(slug: string): RolePermission[] {
  if (slug === PLATFORM_ADMIN_PROFILE_SLUG) return ["*"];
  return getProfilePermissions(slug);
}
