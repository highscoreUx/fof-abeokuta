import {
  createGlobalChatMessage,
  createTeamChatMessage,
} from "@/lib/chat-messages-server";
import {
  serializeActivityChat,
  type ActivityChatBody,
} from "@/lib/activity-chat-types";
import { prisma } from "@/lib/prisma";
import { isTeamChatEnabled } from "@/lib/chat-settings";
import { teamRoom } from "@/server/socket/rooms";
import { tryGetIO } from "@/server/socket/io";
import type { ChatMessage } from "@/types/chat";

export async function postActivityChatMessage(params: {
  eventId: string;
  eventSlug: string;
  authorUserId: string;
  teamId?: string | null;
  teamLetter?: string | null;
  body: ActivityChatBody;
  broadcastToAllChats?: boolean;
}): Promise<ChatMessage> {
  const payload = serializeActivityChat(params.body);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: params.authorUserId },
    select: { username: true, firstName: true, lastName: true },
  });

  if (params.broadcastToAllChats) {
    const globalRecord = await createGlobalChatMessage(
      params.eventId,
      params.eventSlug,
      params.authorUserId,
      payload,
    );

    if (await isTeamChatEnabled(params.eventId)) {
      const teams = await prisma.team.findMany({
        where: { eventId: params.eventId },
        select: { id: true },
      });
      for (const team of teams) {
        await createTeamChatMessage(
          params.eventId,
          params.eventSlug,
          params.authorUserId,
          team.id,
          payload,
        );
      }
    }

    return { ...globalRecord, user };
  }

  if (params.teamId) {
    const record = await createTeamChatMessage(
      params.eventId,
      params.eventSlug,
      params.authorUserId,
      params.teamId,
      payload,
    );
    return { ...record, user };
  }

  const record = await createGlobalChatMessage(
    params.eventId,
    params.eventSlug,
    params.authorUserId,
    payload,
  );
  return { ...record, user };
}

export async function broadcastKahootLive(params: {
  eventId: string;
  eventSlug: string;
  hostUserId: string;
  sessionId: string;
  quizId: string;
  title: string;
}) {
  const body: ActivityChatBody = {
    type: "activity",
    kind: "kahoot",
    sessionId: params.sessionId,
    instanceId: params.quizId,
    title: params.title,
    status: "live",
    action: "started",
    text: `${params.title} is live — join to play or spectate.`,
    metadata: { quizId: params.quizId },
  };

  await postActivityChatMessage({
    eventId: params.eventId,
    eventSlug: params.eventSlug,
    authorUserId: params.hostUserId,
    body,
    broadcastToAllChats: true,
  });
}

export async function emitActivityLiveToTeamRoom(params: {
  eventSlug: string;
  teamLetter: string;
  message: ChatMessage;
}) {
  const io = tryGetIO();
  if (!io) return;
  io.to(teamRoom(params.eventSlug, params.teamLetter)).emit("chat:activity", {
    ...params.message,
    targetRoomId: params.teamLetter,
  });
}
