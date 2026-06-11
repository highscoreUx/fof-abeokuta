import { canViewPassword } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions/catalog";

export interface CheckInUserPayload {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  eventUserRoleSlug: string;
  eventUserRoleName: string;
  teamLetter: string | null;
  checkedInAt: string | null;
  password?: string;
}

export function serializeCheckInUser(
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    pinDisplay: string | null;
    checkedInAt: Date | null;
    team?: { letter: string } | null;
    eventUserRole: { slug: string; name: string };
  },
  viewerPermissions: Permission[],
): CheckInUserPayload {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    eventUserRoleSlug: user.eventUserRole.slug,
    eventUserRoleName: user.eventUserRole.name,
    teamLetter: user.team?.letter ?? null,
    checkedInAt: user.checkedInAt?.toISOString() ?? null,
    password: canViewPassword(viewerPermissions, user.eventUserRole.slug, user.pinDisplay)
      ? (user.pinDisplay ?? undefined)
      : undefined,
  };
}
