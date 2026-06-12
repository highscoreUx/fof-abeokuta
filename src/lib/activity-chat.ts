import {
  createGlobalChatMessage,
  createTeamChatMessage,
  serializeChatMessageRecord,
} from "@/lib/chat-messages-server";
import { prisma } from "@/lib/prisma";
import { isTeamChatEnabled } from "@/lib/chat-settings";
import { teamRoom } from "@/server/socket/rooms";
import { tryGetIO } from "@/server/socket/io";
import type { ChatMessage } from "@/types/chat";

export type ActivityChatKind = "spinner" | "kahoot";

export interface ActivityChatBody {
  type: "activity";
  kind: ActivityChatKind;
  sessionId: string;
  instanceId: string;
  title: string;
  status: "live" | "ended";
  action: "started" | "spin_result" | "ended";
  text: string;
  metadata?: Record<string, unknown>;
}

export function serializeActivityChat(body: ActivityChatBody): string {
  return JSON.stringify(body);
}

export function parseActivityChatBody(body: string): ActivityChatBody | null {
  if (!body.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(body) as Partial<ActivityChatBody>;
    if (
      parsed.type !== "activity" ||
      (parsed.kind !== "spinner" && parsed.kind !== "kahoot") ||
      typeof parsed.sessionId !== "string" ||
      typeof parsed.instanceId !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.text !== "string"
    ) {
      return null;
    }
    return parsed as ActivityChatBody;
  } catch {
    return null;
  }
}

function systemUserForKind(kind: ActivityChatKind) {
  if (kind === "kahoot") {
    return { username: "system", firstName: "Live", lastName: "Trivia" };
  }
  return { username: "system", firstName: "Spinner", lastName: "Activity" };
}

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
