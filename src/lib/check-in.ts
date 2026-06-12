import { getProfileLabelForPermissions } from "@/lib/permission-profiles";
import { primarySocketRoleSlug } from "@/lib/account-permissions";
import type { UserWithAccount } from "@/lib/user-display";
import { resolveUserPermissionList, resolveUserRolePermissions } from "@/lib/user-permissions";

export type CheckInUserPayload = ReturnType<typeof serializeCheckInUser>;

export function serializeCheckInUser(user: UserWithAccount) {
  const permissions = resolveUserRolePermissions(user);
  const effectivePermissions = resolveUserPermissionList(user);
  return {
    id: user.id,
    firstName: user.account.firstName,
    lastName: user.account.lastName,
    username: user.account.username,
    email: user.account.email,
    maskedEmail: user.account.maskedEmail,
    needsEmail: !user.account.email,
    teamId: user.teamId,
    teamLetter: user.team?.letter ?? null,
    checkedInAt: user.checkedInAt?.toISOString() ?? null,
    permissionProfile: getProfileLabelForPermissions(effectivePermissions),
    primaryRoleSlug: primarySocketRoleSlug(permissions),
  };
}
