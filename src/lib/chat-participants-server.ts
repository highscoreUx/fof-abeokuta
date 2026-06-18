import { canAccessStaffChat } from "@/lib/account-permissions";
import { STAFF_ROOM_ID } from "@/lib/chat-staff";
import { isTeamChatEnabled } from "@/lib/chat-settings";
import { getProfileLabelForPermissions } from "@/lib/permission-profiles";
import { resolveUserPermissionList, resolveUserRolePermissions } from "@/lib/user-permissions";
import { isUserOnline } from "@/server/presence";
import type { ChatParticipant } from "@/types/chat";

type ParticipantUser = {
  id: string;
  permissions: unknown | null;
  account: { username: string; firstName: string; lastName: string; permissions: unknown };
  team: { letter: string } | null;
};

export function mapUserToChatParticipant(user: ParticipantUser): ChatParticipant {
  const effectivePermissions = resolveUserPermissionList(user);
  return {
    id: user.id,
    username: user.account.username,
    firstName: user.account.firstName,
    lastName: user.account.lastName,
    teamLetter: user.team?.letter ?? null,
    roleName: getProfileLabelForPermissions(effectivePermissions),
    online: isUserOnline(user.id),
  };
}

export async function resolveChatParticipantRoomIds(
  eventId: string,
  user: ParticipantUser & { teamId?: string | null },
): Promise<string[]> {
  const roomIds = new Set<string>(["global"]);

  if (canAccessStaffChat(resolveUserRolePermissions(user))) {
    roomIds.add(STAFF_ROOM_ID);
  }

  if (user.teamId && (await isTeamChatEnabled(eventId))) {
    roomIds.add(user.teamId);
  }

  return [...roomIds];
}
