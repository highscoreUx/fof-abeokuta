import { canAccessPlatform } from "@/lib/account-permissions";
import {
  getProfilePermissions,
  isParticipantPermissions,
  resolveMemberProfileSlug,
} from "@/lib/role-preset-cache";
import {
  hasWildcardAccess,
  normalizeRolePermissions,
  type RolePermission,
} from "@/lib/permissions/catalog";

export {
  isParticipantPermissions,
  resolveMemberProfileSlug,
} from "@/lib/role-preset-cache";

export const PARTICIPANT_PROFILE_SLUG = "participant";
export const PLATFORM_ADMIN_PROFILE_SLUG = "platform_admin";

export const PLATFORM_ADMIN_PROFILE_OPTION = {
  slug: PLATFORM_ADMIN_PROFILE_SLUG,
  name: "Platform admin",
} as const;

export type GlobalMembersAudience = "all" | "staff";

export function parseGlobalMembersAudience(value: string | null): GlobalMembersAudience {
  return value === "staff" ? "staff" : "all";
}

export function isPlatformAdminPermissions(permissions: unknown): boolean {
  const normalized = normalizeRolePermissions(permissions);
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

export function permissionsForMemberProfileSlug(slug: string): RolePermission[] {
  if (slug === PLATFORM_ADMIN_PROFILE_SLUG) return ["*"];
  return getProfilePermissions(slug);
}
