import type { Server as SocketIOServer } from "socket.io";
import { prisma } from "@/lib/prisma";
import { postActivityChatMessage } from "@/lib/activity-chat";
import type { SpinnerConfig, SpinnerStateSnapshot } from "@/lib/spinner/types";
import { eventRoom, spinnerSessionRoom, teamRoom } from "@/server/socket/rooms";

function parseSpinnerConfig(config: unknown): SpinnerConfig {
  const raw = (config ?? {}) as Partial<SpinnerConfig>;
  const options = Array.isArray(raw.options)
    ? raw.options.map((o) => String(o).trim()).filter(Boolean)
    : [];
  return { options };
}

function toSpinRecord(spin: {
  id: string;
  userId: string;
  selectedIndex: number;
  selectedOption: string;
  createdAt: Date;
  user: { username: string };
}) {
  return {
    id: spin.id,
    userId: spin.userId,
    username: spin.user.username,
    selectedIndex: spin.selectedIndex,
    selectedOption: spin.selectedOption,
    createdAt: spin.createdAt.getTime(),
  };
}

export async function buildSpinnerSnapshot(sessionId: string): Promise<SpinnerStateSnapshot | null> {
  const session = await prisma.spinnerSession.findUnique({
    where: { id: sessionId },
    include: {
      challenge: true,
      team: true,
      activeUser: { select: { id: true, username: true } },
      spins: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { username: true } } },
      },
    },
  });
  if (!session) return null;

  const config = parseSpinnerConfig(session.challenge.config);
  const spinHistory = session.spins.map(toSpinRecord);
  const lastSpin = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1] : null;

  return {
    sessionId: session.id,
    challengeId: session.challengeId,
    title: session.challenge.title,
    options: config.options,
    participationMode: session.challenge.participationMode,
    allowGeneralParticipants: session.challenge.allowGeneralParticipants,
    allowGroupParticipants: session.challenge.allowGroupParticipants,
    teamId: session.teamId,
    teamLetter: session.team?.letter ?? null,
    state: session.state,
    activeUserId: session.activeUserId,
    activeUsername: session.activeUser?.username ?? null,
    startedByUserId: session.startedByUserId,
    lastSpin,
    spinHistory,
    serverNow: Date.now(),
  };
}

async function emitSpinnerState(io: SocketIOServer, eventSlug: string, snapshot: SpinnerStateSnapshot) {
  const rooms = [spinnerSessionRoom(snapshot.sessionId)];
  if (snapshot.teamLetter) {
    rooms.push(teamRoom(eventSlug, snapshot.teamLetter));
  } else {
    rooms.push(eventRoom(eventSlug));
  }

  for (const room of rooms) {
    io.to(room).emit("spinner:state", snapshot);
  }
}

export async function broadcastSpinnerState(io: SocketIOServer, sessionId: string, eventSlug: string) {
  const snapshot = await buildSpinnerSnapshot(sessionId);
  if (!snapshot) return null;
  await emitSpinnerState(io, eventSlug, snapshot);
  return snapshot;
}

export async function getActiveSpinnerSessionForChallenge(challengeId: string) {
  return prisma.spinnerSession.findFirst({
    where: { challengeId, state: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
}

export async function startSpinnerSession(
  io: SocketIOServer,
  params: {
    challengeId: string;
    eventId: string;
    eventSlug: string;
    userId: string;
    teamId: string | null;
  },
) {
  const challenge = await prisma.spinChallenge.findFirst({
    where: { id: params.challengeId, eventId: params.eventId },
    include: { team: true },
  });
  if (!challenge) throw new Error("Spinner activity not found");

  const config = parseSpinnerConfig(challenge.config);
  if (config.options.length < 2) {
    throw new Error("Add at least two wheel options before starting.");
  }

  const existing = await getActiveSpinnerSessionForChallenge(challenge.id);
  if (existing) {
    return broadcastSpinnerState(io, existing.id, params.eventSlug);
  }

  const isTeamScoped = challenge.allowGroupParticipants && !challenge.allowGeneralParticipants;
  if (isTeamScoped && !params.teamId) {
    throw new Error("Join a team to start this spinner.");
  }

  const team = params.teamId
    ? await prisma.team.findFirst({
        where: { id: params.teamId, eventId: params.eventId },
      })
    : null;

  const session = await prisma.spinnerSession.create({
    data: {
      challengeId: challenge.id,
      eventId: params.eventId,
      teamId: isTeamScoped ? params.teamId : null,
      activeUserId:
        challenge.participationMode === "ONE_AT_A_TIME" ? params.userId : null,
      startedByUserId: params.userId,
    },
  });

  await postActivityChatMessage({
    eventId: params.eventId,
    eventSlug: params.eventSlug,
    authorUserId: params.userId,
    teamId: isTeamScoped ? team?.id : undefined,
    body: {
      type: "activity",
      kind: "spinner",
      sessionId: session.id,
      instanceId: challenge.id,
      title: challenge.title,
      status: "live",
      action: "started",
      text: `${challenge.title} is live — spin the wheel or spectate.`,
      metadata: { participationMode: challenge.participationMode },
    },
  });

  return broadcastSpinnerState(io, session.id, params.eventSlug);
}

export async function performSpinnerSpin(
  io: SocketIOServer,
  params: {
    sessionId: string;
    eventId: string;
    eventSlug: string;
    userId: string;
    teamId: string | null;
  },
) {
  const session = await prisma.spinnerSession.findFirst({
    where: { id: params.sessionId, eventId: params.eventId, state: "ACTIVE" },
    include: { challenge: true, team: true },
  });
  if (!session) throw new Error("Spinner session not found");

  const config = parseSpinnerConfig(session.challenge.config);
  if (config.options.length < 2) throw new Error("No wheel options configured");

  if (session.challenge.participationMode === "ONE_AT_A_TIME") {
    const activeId = session.activeUserId ?? session.startedByUserId;
    if (params.userId !== activeId) {
      throw new Error("Wait for your turn to spin.");
    }
  }

  if (session.teamId && params.teamId !== session.teamId) {
    throw new Error("This spinner is for another team.");
  }

  const selectedIndex = Math.floor(Math.random() * config.options.length);
  const selectedOption = config.options[selectedIndex];

  const spin = await prisma.spinnerSpin.create({
    data: {
      sessionId: session.id,
      userId: params.userId,
      selectedIndex,
      selectedOption,
    },
    include: { user: { select: { username: true } } },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: params.userId },
    select: { username: true },
  });

  await postActivityChatMessage({
    eventId: params.eventId,
    eventSlug: params.eventSlug,
    authorUserId: params.userId,
    teamId: session.teamId ?? undefined,
    body: {
      type: "activity",
      kind: "spinner",
      sessionId: session.id,
      instanceId: session.challengeId,
      title: session.challenge.title,
      status: "live",
      action: "spin_result",
      text: `${user.username} spun: ${selectedOption}`,
      metadata: {
        selectedIndex,
        selectedOption,
        spinId: spin.id,
      },
    },
  });

  return broadcastSpinnerState(io, session.id, params.eventSlug);
}

export async function endSpinnerSession(
  io: SocketIOServer,
  params: {
    sessionId: string;
    eventId: string;
    eventSlug: string;
    userId: string;
  },
) {
  const session = await prisma.spinnerSession.findFirst({
    where: { id: params.sessionId, eventId: params.eventId, state: "ACTIVE" },
    include: { challenge: true },
  });
  if (!session) throw new Error("Spinner session not found");

  await prisma.spinnerSession.update({
    where: { id: session.id },
    data: { state: "COMPLETED", endedAt: new Date() },
  });

  await postActivityChatMessage({
    eventId: params.eventId,
    eventSlug: params.eventSlug,
    authorUserId: params.userId,
    teamId: session.teamId ?? undefined,
    body: {
      type: "activity",
      kind: "spinner",
      sessionId: session.id,
      instanceId: session.challengeId,
      title: session.challenge.title,
      status: "ended",
      action: "ended",
      text: `${session.challenge.title} has ended.`,
    },
  });

  return broadcastSpinnerState(io, session.id, params.eventSlug);
}

export function getSpinnerOptionsFromConfig(config: unknown): string[] {
  return parseSpinnerConfig(config).options;
}
