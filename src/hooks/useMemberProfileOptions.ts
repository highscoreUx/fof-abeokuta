"use client";

import { useMemo } from "react";
import {
  isPlatformAdminPermissions,
  PLATFORM_ADMIN_PROFILE_OPTION,
  PLATFORM_ADMIN_PROFILE_SLUG,
} from "@/lib/member-access";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";
import type { PlatformRoleRow } from "@/lib/platform-roles.types";

export function useCanAssignPlatformAdminProfile(): boolean {
  const admin = usePlatformAuthStore((state) => state.admin);
  return Boolean(admin && isPlatformAdminPermissions(admin.permissions));
}

export function buildMemberProfileOptions(input: {
  roles: PlatformRoleRow[];
  includePlatformAdmin?: boolean;
  memberIsPlatformAdmin?: boolean;
}): Array<{ slug: string; name: string }> {
  if (input.memberIsPlatformAdmin) {
    return [PLATFORM_ADMIN_PROFILE_OPTION];
  }

  const options = input.roles.map((role) => ({ slug: role.slug, name: role.name }));

  if (
    input.includePlatformAdmin &&
    !options.some((option) => option.slug === PLATFORM_ADMIN_PROFILE_SLUG)
  ) {
    options.unshift(PLATFORM_ADMIN_PROFILE_OPTION);
  }

  return options;
}

export function useMemberProfileOptions(options: {
  roles: PlatformRoleRow[];
  memberIsPlatformAdmin?: boolean;
}): Array<{ slug: string; name: string }> {
  const canAssignPlatformAdmin = useCanAssignPlatformAdminProfile();

  return useMemo(
    () =>
      buildMemberProfileOptions({
        roles: options.roles,
        memberIsPlatformAdmin: options.memberIsPlatformAdmin,
        includePlatformAdmin: canAssignPlatformAdmin,
      }),
    [options.roles, options.memberIsPlatformAdmin, canAssignPlatformAdmin],
  );
}
