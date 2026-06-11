import type { Server as SocketIOServer } from "socket.io";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { eventRoom } from "@/server/socket/rooms";

const SPIN_PROMPTS = [
  "Build a login screen in 10 minutes",
  "Design a mobile checkout flow",
  "Create a dashboard widget for analytics",
  "Prototype a team chat interface",
  "Design an onboarding carousel",
  "Build a settings page with dark mode toggle",
];

export async function getActiveSpinChallenge(eventId: string) {
  return prisma.spinChallenge.findFirst({
    where: { eventId, state: { in: ["ACTIVE", "REVIEWING"] } },
    include: { submissions: { include: { team: true, user: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function startSpinChallenge(
  io: SocketIOServer,
  eventId: string,
  options?: {
    title?: string;
    allowGeneralParticipants?: boolean;
    allowGroupParticipants?: boolean;
  },
) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
  const prompt = SPIN_PROMPTS[Math.floor(Math.random() * SPIN_PROMPTS.length)];

  const challenge = await prisma.spinChallenge.create({
    data: {
      eventId,
      title: options?.title ?? "Spin to Build",
      config: { prompt },
      state: "ACTIVE",
      allowGeneralParticipants: options?.allowGeneralParticipants ?? false,
      allowGroupParticipants: options?.allowGroupParticipants ?? true,
      teamId: null,
    },
  });

  io.to(eventRoom(event.slug)).emit("spin:state", {
    challengeId: challenge.id,
    title: challenge.title,
    prompt,
    state: challenge.state,
    allowGeneralParticipants: challenge.allowGeneralParticipants,
    allowGroupParticipants: challenge.allowGroupParticipants,
    submissions: [],
  });

  return challenge;
}

export async function submitSpinBuild(
  challengeId: string,
  teamId: string,
  userId: string,
  payload: Record<string, unknown>,
) {
  const jsonPayload = payload as Prisma.InputJsonValue;

  return prisma.spinSubmission.upsert({
    where: { challengeId_teamId: { challengeId, teamId } },
    create: { challengeId, teamId, userId, payload: jsonPayload },
    update: { userId, payload: jsonPayload },
    include: { team: true, user: true },
  });
}

export async function broadcastSpinState(io: SocketIOServer, eventSlug: string) {
  const event = await prisma.event.findUnique({ where: { slug: eventSlug } });
  if (!event) return;

  const challenge = await getActiveSpinChallenge(event.id);
  if (!challenge) return;

  io.to(eventRoom(eventSlug)).emit("spin:state", {
    challengeId: challenge.id,
    title: challenge.title,
    prompt: (challenge.config as { prompt?: string }).prompt,
    state: challenge.state,
    allowGeneralParticipants: challenge.allowGeneralParticipants,
    allowGroupParticipants: challenge.allowGroupParticipants,
    submissions: challenge.submissions.map((s) => ({
      id: s.id,
      teamLetter: s.team.letter,
      username: s.user.username,
      payload: s.payload,
    })),
  });
}

export async function completeSpinChallenge(
  io: SocketIOServer,
  challengeId: string,
  eventSlug: string,
) {
  await prisma.spinChallenge.update({
    where: { id: challengeId },
    data: { state: "COMPLETED" },
  });
  await broadcastSpinState(io, eventSlug);
}
