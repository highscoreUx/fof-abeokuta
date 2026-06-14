import {
  isPlatformAdminPermissions,
  permissionsForMemberProfileSlug,
  PLATFORM_ADMIN_PROFILE_SLUG,
} from "@/lib/member-access";
import { getProfileBySlug } from "@/lib/platform-roles.server";
import type { RolePermission } from "@/lib/permissions/catalog";

export const PLATFORM_ADMIN_PROFILE_OPTION = {
  slug: PLATFORM_ADMIN_PROFILE_SLUG,
  name: "Platform admin",
} as const;

export function isKnownMemberProfileSlug(slug: string): boolean {
  return slug === PLATFORM_ADMIN_PROFILE_SLUG || Boolean(getProfileBySlug(slug));
}

export function canAssignPlatformAdminProfile(actorPermissions: RolePermission[]): boolean {
  return isPlatformAdminPermissions(actorPermissions);
}

export function validateMemberProfileAssignment(
  actorPermissions: RolePermission[],
  profileSlug: string,
): string | null {
  if (!isKnownMemberProfileSlug(profileSlug)) {
    return "Unknown role";
  }

  if (
    profileSlug === PLATFORM_ADMIN_PROFILE_SLUG &&
    !canAssignPlatformAdminProfile(actorPermissions)
  ) {
    return "Only a platform admin can assign the platform admin role";
  }

  return null;
}

export function permissionsForMemberProfile(profileSlug: string): RolePermission[] {
  if (!isKnownMemberProfileSlug(profileSlug)) {
    throw new Error("Unknown role");
  }
  return permissionsForMemberProfileSlug(profileSlug);
}
