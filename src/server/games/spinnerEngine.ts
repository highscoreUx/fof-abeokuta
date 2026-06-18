import type { Server as SocketIOServer } from "socket.io";
import { isChatSocialChallengeTitle } from "@/lib/chat-social-challenges";
import { prisma } from "@/lib/prisma";
import { postActivityChatMessage } from "@/lib/activity-chat-server";
import type { SpinnerConfig, SpinnerStateSnapshot } from "@/lib/spinner/types";
import { eventRoom, spinnerSessionRoom, teamRoom, userRoom } from "@/server/socket/rooms";

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
  user: { account: { username: string } };
}) {
  return {
    id: spin.id,
    userId: spin.userId,
    username: spin.user.account.username,
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
      activeUser: { select: { id: true, account: { select: { username: true } } } },
      spins: {
        orderBy: { createdAt: "asc" },
        include: { user: { include: { account: { select: { username: true } } } } },
      },
      chatSession: {
        select: {
          id: true,
          participants: { select: { userId: true, role: true } },
        },
      },
    },
  });
  if (!session) return null;

  const config = parseSpinnerConfig(session.challenge.config);
  const spinHistory = session.spins.map(toSpinRecord);
  const lastSpin = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1] : null;

  const title =
    isChatSocialChallengeTitle(session.challenge.title) ? "Spinner" : session.challenge.title;
  const playerUserIds = session.isSocial
    ? session.chatSession?.participants
        .filter((participant) => participant.role === "player")
        .map((participant) => participant.userId) ?? []
    : [];
  const spectatorUserIds = session.isSocial
    ? session.chatSession?.participants
        .filter((participant) => participant.role === "spectator")
        .map((participant) => participant.userId) ?? []
    : [];

  return {
    sessionId: session.id,
    challengeId: session.challengeId,
    title,
    options: config.options,
    participationMode: session.challenge.participationMode,
    allowGeneralParticipants: session.challenge.allowGeneralParticipants,
    allowGroupParticipants: session.challenge.allowGroupParticipants,
    teamId: session.teamId,
    teamLetter: session.team?.letter ?? null,
    state: session.state,
    activeUserId: session.activeUserId,
    activeUsername: session.activeUser?.account.username ?? null,
    startedByUserId: session.startedByUserId,
    lastSpin,
    spinHistory,
    isSocial: session.isSocial,
    chatSessionId: session.chatSession?.id ?? null,
    playerUserIds,
    spectatorUserIds,
    serverNow: Date.now(),
  };
}

async function emitSpinnerState(io: SocketIOServer, eventSlug: string, snapshot: SpinnerStateSnapshot) {
  const rooms = new Set<string>([spinnerSessionRoom(snapshot.sessionId)]);

  if (snapshot.isSocial) {
    for (const userId of [...snapshot.playerUserIds, ...snapshot.spectatorUserIds]) {
      rooms.add(userRoom(userId));
    }
  } else if (snapshot.teamLetter) {
    rooms.add(teamRoom(eventSlug, snapshot.teamLetter));
    rooms.add(eventRoom(eventSlug));
  } else {
    rooms.add(eventRoom(eventSlug));
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

/** One query for active sessions across many challenges (list views). */
export async function mapActiveSpinnerSessionsByChallengeId(
  challengeIds: string[],
): Promise<Map<string, string>> {
  if (challengeIds.length === 0) return new Map();

  const sessions = await prisma.spinnerSession.findMany({
    where: { challengeId: { in: challengeIds }, state: "ACTIVE" },
    select: { id: true, challengeId: true },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<string, string>();
  for (const session of sessions) {
    if (!map.has(session.challengeId)) {
      map.set(session.challengeId, session.id);
    }
  }
  return map;
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

export async function createSocialSpinnerSessionRecord(params: {
  challengeId: string;
  eventId: string;
  eventSlug: string;
  hostUserId: string;
  teamId: string | null;
}) {
  const challenge = await prisma.spinChallenge.findFirst({
    where: { id: params.challengeId, eventId: params.eventId },
  });
  if (!challenge) throw new Error("Spinner activity not found");

  const config = parseSpinnerConfig(challenge.config);
  if (config.options.length < 2) {
    throw new Error("Spinner is not configured.");
  }

  return prisma.spinnerSession.create({
    data: {
      challengeId: challenge.id,
      eventId: params.eventId,
      isSocial: true,
      teamId: params.teamId,
      startedByUserId: params.hostUserId,
    },
  });
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
    include: {
      challenge: true,
      team: true,
      chatSession: {
        include: { participants: true },
      },
    },
  });
  if (!session) throw new Error("Spinner session not found");

  const config = parseSpinnerConfig(session.challenge.config);
  if (config.options.length < 2) throw new Error("No wheel options configured");

  if (session.isSocial) {
    const isPlayer = session.chatSession?.participants.some(
      (participant) => participant.userId === params.userId && participant.role === "player",
    );
    if (!isPlayer) throw new Error("Only players in this game can spin.");
  } else if (session.challenge.participationMode === "ONE_AT_A_TIME") {
    const activeId = session.activeUserId ?? session.startedByUserId;
    if (params.userId !== activeId) {
      throw new Error("Wait for your turn to spin.");
    }
  }

  if (!session.isSocial && session.teamId && params.teamId !== session.teamId) {
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
    include: { user: { include: { account: { select: { username: true } } } } },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: params.userId },
    include: { account: { select: { username: true } } },
  });

  if (!session.isSocial) {
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
        text: `${user.account.username} spun: ${selectedOption}`,
        metadata: {
          selectedIndex,
          selectedOption,
          spinId: spin.id,
        },
      },
    });
  }

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

  if (!session.isSocial) {
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
  } else {
    const { completeSocialChatGameFromSpinner } = await import("@/server/games/chatGameEngine");
    await completeSocialChatGameFromSpinner(session.id, params.eventSlug);
  }

  return broadcastSpinnerState(io, session.id, params.eventSlug);
}

export function getSpinnerOptionsFromConfig(config: unknown): string[] {
  return parseSpinnerConfig(config).options;
}
