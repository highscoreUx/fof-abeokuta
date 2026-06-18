import {
  CHAT_PARTICIPANTS_REMOVE_EVENT,
  CHAT_PARTICIPANTS_UPSERT_EVENT,
  type ChatParticipantsRemovePayload,
  type ChatParticipantsUpsertPayload,
} from "@/lib/chat-participants";
import {
  mapUserToChatParticipant,
  resolveChatParticipantRoomIds,
} from "@/lib/chat-participants-server";
import { userWithAccountInclude } from "@/lib/user-display";
import { prisma } from "@/lib/prisma";
import { tryGetIO } from "@/server/socket/io";
import { eventRoom } from "@/server/socket/rooms";

export async function broadcastChatParticipantForUserId(
  eventSlug: string,
  eventId: string,
  userId: string,
  options?: { previousTeamId?: string | null },
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, eventId },
    include: userWithAccountInclude,
  });
  if (!user) return;

  await broadcastChatParticipantMembership(eventSlug, eventId, user, options);
}

export async function broadcastChatParticipantMembership(
  eventSlug: string,
  eventId: string,
  user: {
    id: string;
    teamId: string | null;
    permissions: unknown | null;
    account: { username: string; firstName: string; lastName: string; permissions: unknown };
    team: { letter: string } | null;
  },
  options?: { previousTeamId?: string | null },
) {
  const io = tryGetIO();
  if (!io) return;

  const participant = mapUserToChatParticipant(user);
  const roomIds = await resolveChatParticipantRoomIds(eventId, user);
  const room = eventRoom(eventSlug);

  for (const roomId of roomIds) {
    const payload: ChatParticipantsUpsertPayload = { roomId, participant };
    io.to(room).emit(CHAT_PARTICIPANTS_UPSERT_EVENT, payload);
  }

  const previousTeamId = options?.previousTeamId ?? null;
  if (previousTeamId && previousTeamId !== user.teamId && roomIds.includes(previousTeamId) === false) {
    const removePayload: ChatParticipantsRemovePayload = {
      roomId: previousTeamId,
      userId: user.id,
    };
    io.to(room).emit(CHAT_PARTICIPANTS_REMOVE_EVENT, removePayload);
  }
}

export async function broadcastChatParticipantsForUserIds(
  eventSlug: string,
  eventId: string,
  userIds: string[],
  previousTeamIds?: Map<string, string | null>,
) {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return;

  for (const userId of uniqueIds) {
    await broadcastChatParticipantForUserId(eventSlug, eventId, userId, {
      previousTeamId: previousTeamIds?.get(userId),
    });
  }
}
