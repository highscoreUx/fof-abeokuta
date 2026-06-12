import { getProfileLabelForPermissions } from "@/lib/permission-profiles";
import { primarySocketRoleSlug, resolveAccountPermissions } from "@/lib/account-permissions";
import type { UserWithAccount } from "@/lib/user-display";

export type CheckInUserPayload = ReturnType<typeof serializeCheckInUser>;

export function serializeCheckInUser(user: UserWithAccount) {
  const permissions = resolveAccountPermissions(user.account);
  return {
    id: user.id,
    firstName: user.account.firstName,
    lastName: user.account.lastName,
    username: user.account.username,
    email: user.account.email,
    teamId: user.teamId,
    teamLetter: user.team?.letter ?? null,
    checkedInAt: user.checkedInAt?.toISOString() ?? null,
    permissionProfile: getProfileLabelForPermissions(user.account.permissions),
    primaryRoleSlug: primarySocketRoleSlug(permissions),
  };
}
