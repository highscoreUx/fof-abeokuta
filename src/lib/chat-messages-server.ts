import { normalizeChatPayload } from "@/lib/chat-content";
import { castPollVote, parsePollBody, serializePoll } from "@/lib/chat-poll";
import { prisma } from "@/lib/prisma";
import { tryGetIO } from "@/server/socket/io";
import { eventRoom, teamRoom, userRoom } from "@/server/socket/rooms";

const userSelect = { select: { username: true, firstName: true, lastName: true } } as const;

export function serializeChatMessageRecord(message: {
  id: string;
  body: string;
  createdAt: Date;
  teamId: string | null;
  recipientId?: string | null;
  userId: string;
  user: { username: string; firstName: string; lastName: string };
}) {
  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    userId: message.userId,
    ...(message.teamId ? { teamId: message.teamId } : {}),
    ...(message.recipientId ? { recipientId: message.recipientId } : {}),
    user: message.user,
  };
}

type SerializedChatMessage = ReturnType<typeof serializeChatMessageRecord>;

function broadcastChatMessage(
  eventSlug: string,
  message: SerializedChatMessage,
  scope: { type: "global" } | { type: "team"; letter: string },
) {
  const io = tryGetIO();
  if (!io) return;

  if (scope.type === "team") {
    const room = teamRoom(eventSlug, scope.letter);
    io.in(room).emit("team:message", message);
    io.in(room).emit("poll:update", message);
    return;
  }

  const room = eventRoom(eventSlug);
  io.in(room).emit("global:message", message);
  io.in(room).emit("poll:update", message);
}

export function broadcastGlobalMessage(eventSlug: string, message: SerializedChatMessage) {
  broadcastChatMessage(eventSlug, message, { type: "global" });
}

export function broadcastTeamMessage(
  eventSlug: string,
  teamLetter: string,
  message: SerializedChatMessage,
) {
  broadcastChatMessage(eventSlug, message, { type: "team", letter: teamLetter });
}

export function broadcastDirectMessage(
  senderId: string,
  recipientId: string,
  message: SerializedChatMessage,
) {
  const io = tryGetIO();
  if (!io) return;

  io.in(userRoom(senderId)).emit("dm:message", message);
  io.in(userRoom(recipientId)).emit("dm:message", message);
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

export async function createDirectChatMessage(
  eventId: string,
  senderId: string,
  recipientId: string,
  payload: unknown,
) {
  if (senderId === recipientId) throw new Error("Cannot message yourself");

  const body = normalizeChatPayload(payload);
  if (!body) throw new Error("Invalid message");

  const recipient = await prisma.user.findFirst({
    where: { id: recipientId, eventId },
    select: { id: true },
  });
  if (!recipient) throw new Error("User not found");

  const message = await prisma.message.create({
    data: {
      body,
      event: { connect: { id: eventId } },
      user: { connect: { id: senderId } },
      recipient: { connect: { id: recipientId } },
    },
    include: { user: userSelect },
  });

  const serialized = serializeChatMessageRecord(message);
  broadcastDirectMessage(senderId, recipientId, serialized);
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
  if (message.recipientId) {
    broadcastDirectMessage(message.userId, message.recipientId, serialized);
  } else if (message.teamId && message.team) {
    broadcastTeamMessage(eventSlug, message.team.letter, serialized);
  } else {
    broadcastGlobalMessage(eventSlug, serialized);
  }
  return serialized;
}
