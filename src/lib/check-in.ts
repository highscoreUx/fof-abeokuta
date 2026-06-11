import { canViewPassword } from "@/lib/permissions";
import type { Role } from "@/types";

export interface CheckInUserPayload {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: Role;
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
    role: Role;
    pinDisplay: string | null;
    checkedInAt: Date | null;
    team?: { letter: string } | null;
  },
  viewerRole: Role,
): CheckInUserPayload {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    role: user.role,
    teamLetter: user.team?.letter ?? null,
    checkedInAt: user.checkedInAt?.toISOString() ?? null,
    password: canViewPassword(viewerRole, user.role, user.pinDisplay)
      ? (user.pinDisplay ?? undefined)
      : undefined,
  };
}
