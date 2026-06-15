import type { Server as SocketIOServer } from "socket.io";
import { prisma } from "@/lib/prisma";
import { postActivityChatMessage } from "@/lib/activity-chat-server";
import {
  computeCountdownRemainingMs,
  type CountdownSessionState,
  type CountdownStateSnapshot,
} from "@/lib/countdown/types";
import { countdownSessionRoom, eventRoom } from "@/server/socket/rooms";

const ACTIVE_STATES: CountdownSessionState[] = ["RUNNING", "PAUSED"];

async function maybeAutoFinishSession(sessionId: string) {
  const session = await prisma.countdownSession.findUnique({
    where: { id: sessionId },
    include: { challenge: true },
  });
  if (!session || session.state !== "RUNNING" || !session.startedAt) return session;

  const serverNow = Date.now();
  const remainingMs = computeCountdownRemainingMs({
    state: session.state,
    segmentDurationMs: session.segmentDurationMs,
    startedAt: session.startedAt.getTime(),
    pausedRemainingMs: session.pausedRemainingMs,
    durationSec: session.challenge.durationSec,
    serverNow,
  });

  if (remainingMs > 0) return session;

  return prisma.countdownSession.update({
    where: { id: sessionId },
    data: { state: "FINISHED", endedAt: new Date(serverNow), startedAt: null, pausedRemainingMs: 0 },
    include: { challenge: true },
  });
}

export async function buildCountdownSnapshot(
  sessionId: string,
): Promise<CountdownStateSnapshot | null> {
  const session = await maybeAutoFinishSession(sessionId);
  if (!session) return null;

  const serverNow = Date.now();
  const state = session.state as CountdownSessionState;
  const startedAt = session.startedAt?.getTime() ?? null;

  return {
    sessionId: session.id,
    challengeId: session.challengeId,
    title: session.challenge.title,
    durationSec: session.challenge.durationSec,
    allowGeneralParticipants: session.challenge.allowGeneralParticipants,
    allowGroupParticipants: session.challenge.allowGroupParticipants,
    state,
    segmentDurationMs: session.segmentDurationMs,
    startedAt,
    pausedRemainingMs: session.pausedRemainingMs,
    remainingMs: computeCountdownRemainingMs({
      state,
      segmentDurationMs: session.segmentDurationMs,
      startedAt,
      pausedRemainingMs: session.pausedRemainingMs,
      durationSec: session.challenge.durationSec,
      serverNow,
    }),
    serverNow,
  };
}

async function emitCountdownState(
  io: SocketIOServer,
  eventSlug: string,
  snapshot: CountdownStateSnapshot,
) {
  const rooms = [countdownSessionRoom(snapshot.sessionId), eventRoom(eventSlug)];
  for (const room of rooms) {
    io.to(room).emit("countdown:state", snapshot);
  }
}

export async function broadcastCountdownState(
  io: SocketIOServer,
  sessionId: string,
  eventSlug: string,
) {
  const snapshot = await buildCountdownSnapshot(sessionId);
  if (!snapshot) return null;
  await emitCountdownState(io, eventSlug, snapshot);
  return snapshot;
}

export async function getActiveCountdownSessionForChallenge(challengeId: string) {
  return prisma.countdownSession.findFirst({
    where: { challengeId, state: { in: ACTIVE_STATES } },
    orderBy: { createdAt: "desc" },
  });
}

export async function mapActiveCountdownSessionsByChallengeId(challengeIds: string[]) {
  if (challengeIds.length === 0) return new Map<string, { id: string; state: CountdownSessionState }>();

  const sessions = await prisma.countdownSession.findMany({
    where: { challengeId: { in: challengeIds }, state: { in: ACTIVE_STATES } },
    select: { id: true, challengeId: true, state: true },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<string, { id: string; state: CountdownSessionState }>();
  for (const session of sessions) {
    if (!map.has(session.challengeId)) {
      map.set(session.challengeId, {
        id: session.id,
        state: session.state as CountdownSessionState,
      });
    }
  }
  return map;
}

export async function startCountdownSession(
  io: SocketIOServer,
  params: {
    challengeId: string;
    eventId: string;
    eventSlug: string;
    userId: string;
  },
) {
  const challenge = await prisma.countdownChallenge.findFirst({
    where: { id: params.challengeId, eventId: params.eventId },
  });
  if (!challenge) throw new Error("Countdown not found");

  const existing = await getActiveCountdownSessionForChallenge(challenge.id);
  if (existing) throw new Error("A countdown is already running for this activity");

  const durationMs = challenge.durationSec * 1000;
  const session = await prisma.countdownSession.create({
    data: {
      challengeId: challenge.id,
      eventId: params.eventId,
      state: "RUNNING",
      segmentDurationMs: durationMs,
      startedAt: new Date(),
      startedByUserId: params.userId,
    },
  });

  await postActivityChatMessage({
    eventId: params.eventId,
    eventSlug: params.eventSlug,
    authorUserId: params.userId,
    broadcastToAllChats: true,
    body: {
      type: "activity",
      kind: "countdown",
      sessionId: session.id,
      instanceId: challenge.id,
      title: challenge.title,
      status: "live",
      action: "started",
      text: `${challenge.title} timer started.`,
    },
  });

  return broadcastCountdownState(io, session.id, params.eventSlug);
}

export async function pauseCountdownSession(
  io: SocketIOServer,
  params: { sessionId: string; eventId: string; eventSlug: string },
) {
  const session = await prisma.countdownSession.findFirst({
    where: { id: params.sessionId, eventId: params.eventId },
    include: { challenge: true },
  });
  if (!session || session.state !== "RUNNING" || !session.startedAt) {
    throw new Error("Countdown is not running");
  }

  const serverNow = Date.now();
  const remainingMs = computeCountdownRemainingMs({
    state: "RUNNING",
    segmentDurationMs: session.segmentDurationMs,
    startedAt: session.startedAt.getTime(),
    pausedRemainingMs: null,
    durationSec: session.challenge.durationSec,
    serverNow,
  });

  await prisma.countdownSession.update({
    where: { id: session.id },
    data: {
      state: "PAUSED",
      pausedRemainingMs: remainingMs,
      startedAt: null,
    },
  });

  return broadcastCountdownState(io, session.id, params.eventSlug);
}

export async function resumeCountdownSession(
  io: SocketIOServer,
  params: { sessionId: string; eventId: string; eventSlug: string },
) {
  const session = await prisma.countdownSession.findFirst({
    where: { id: params.sessionId, eventId: params.eventId },
  });
  if (!session || session.state !== "PAUSED" || session.pausedRemainingMs == null) {
    throw new Error("Countdown is not paused");
  }

  await prisma.countdownSession.update({
    where: { id: session.id },
    data: {
      state: "RUNNING",
      segmentDurationMs: session.pausedRemainingMs,
      startedAt: new Date(),
      pausedRemainingMs: null,
    },
  });

  return broadcastCountdownState(io, session.id, params.eventSlug);
}

export async function resetCountdownSession(
  io: SocketIOServer,
  params: { sessionId: string; eventId: string; eventSlug: string },
) {
  const session = await prisma.countdownSession.findFirst({
    where: { id: params.sessionId, eventId: params.eventId },
  });
  if (!session) throw new Error("Countdown session not found");

  await prisma.countdownSession.update({
    where: { id: session.id },
    data: {
      state: "FINISHED",
      endedAt: new Date(),
      startedAt: null,
      pausedRemainingMs: null,
    },
  });

  return broadcastCountdownState(io, session.id, params.eventSlug);
}

export async function adjustCountdownSession(
  io: SocketIOServer,
  params: {
    sessionId: string;
    eventId: string;
    eventSlug: string;
    deltaSec: number;
  },
) {
  const session = await prisma.countdownSession.findFirst({
    where: { id: params.sessionId, eventId: params.eventId },
    include: { challenge: true },
  });
  if (!session || !ACTIVE_STATES.includes(session.state as CountdownSessionState)) {
    throw new Error("Countdown is not active");
  }

  const deltaMs = params.deltaSec * 1000;
  const serverNow = Date.now();

  if (session.state === "PAUSED") {
    const remainingMs = Math.max(0, (session.pausedRemainingMs ?? 0) + deltaMs);
    await prisma.countdownSession.update({
      where: { id: session.id },
      data: { pausedRemainingMs: remainingMs },
    });
  } else if (session.startedAt) {
    const remainingMs = Math.max(
      0,
      computeCountdownRemainingMs({
        state: "RUNNING",
        segmentDurationMs: session.segmentDurationMs,
        startedAt: session.startedAt.getTime(),
        pausedRemainingMs: null,
        durationSec: session.challenge.durationSec,
        serverNow,
      }) + deltaMs,
    );
    await prisma.countdownSession.update({
      where: { id: session.id },
      data: {
        segmentDurationMs: remainingMs,
        startedAt: new Date(),
      },
    });
  }

  return broadcastCountdownState(io, session.id, params.eventSlug);
}
