import { normalizeChatPayload } from "@/lib/chat-content";
import { castPollVote, parsePollBody, serializePoll } from "@/lib/chat-poll";
import { prisma } from "@/lib/prisma";
import { tryGetIO } from "@/server/socket/io";
import { eventRoom, teamRoom } from "@/server/socket/rooms";

const userSelect = { select: { username: true, firstName: true, lastName: true } } as const;

export function serializeChatMessageRecord(message: {
  id: string;
  body: string;
  createdAt: Date;
  teamId: string | null;
  user: { username: string; firstName: string; lastName: string };
}) {
  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    ...(message.teamId ? { teamId: message.teamId } : {}),
    user: message.user,
  };
}

export function broadcastGlobalMessage(eventSlug: string, message: ReturnType<typeof serializeChatMessageRecord>) {
  tryGetIO()?.to(eventRoom(eventSlug)).emit("global:message", message);
}

export function broadcastTeamMessage(
  eventSlug: string,
  teamLetter: string,
  message: ReturnType<typeof serializeChatMessageRecord>,
) {
  tryGetIO()?.to(teamRoom(eventSlug, teamLetter)).emit("team:message", message);
}

export async function createGlobalChatMessage(
  eventId: string,
  eventSlug: string,
  userId: string,
  payload: unknown,
) {
  const body = normalizeChatPayload(payload);
  if (!body) throw new Error("Invalid message");

  const message = await prisma.message.create({
    data: {
      body,
      event: { connect: { id: eventId } },
      user: { connect: { id: userId } },
    },
    include: { user: userSelect },
  });

  const serialized = serializeChatMessageRecord(message);
  broadcastGlobalMessage(eventSlug, serialized);
  return serialized;
}

export async function createTeamChatMessage(
  eventId: string,
  eventSlug: string,
  userId: string,
  teamId: string,
  payload: unknown,
) {
  const body = normalizeChatPayload(payload);
  if (!body) throw new Error("Invalid message");

  const team = await prisma.team.findFirst({
    where: { id: teamId, eventId },
    select: { id: true, letter: true },
  });
  if (!team) throw new Error("Team not found");

  const message = await prisma.message.create({
    data: {
      body,
      event: { connect: { id: eventId } },
      user: { connect: { id: userId } },
      team: { connect: { id: team.id } },
    },
    include: { user: userSelect },
  });

  const serialized = serializeChatMessageRecord(message);
  broadcastTeamMessage(eventSlug, team.letter, serialized);
  return serialized;
}

export async function castChatPollVote(
  eventId: string,
  eventSlug: string,
  messageId: string,
  userId: string,
  optionIndex: number,
) {
  const message = await prisma.message.findFirst({
    where: { id: messageId, eventId },
    include: {
      user: userSelect,
      team: { select: { letter: true } },
    },
  });
  if (!message) throw new Error("Message not found");

  const poll = parsePollBody(message.body);
  if (!poll) throw new Error("Not a poll");

  const updatedPoll = castPollVote(poll, userId, optionIndex);

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { body: serializePoll(updatedPoll) },
    include: { user: userSelect },
  });

  const serialized = serializeChatMessageRecord(updated);
  if (message.teamId && message.team) {
    broadcastTeamMessage(eventSlug, message.team.letter, serialized);
  } else {
    broadcastGlobalMessage(eventSlug, serialized);
  }
  return serialized;
}
