import type { Server as SocketIOServer } from "socket.io";
import { assertChatSocialGameAllowed } from "@/lib/chat-game-settings";
import { getChatGameDefaults, isChatGameAllowedForChannel } from "@/lib/activities/manifest";
import {
  parseChatGameMessageBody,
  serializeChatGameMessage,
  chatGameTitle,
  isChatGameKind,
  type ChatGameKind,
  type ChatGameMessageBody,
  type ChatGameSessionSnapshot,
} from "@/lib/chat-game-types";
import {
  broadcastDirectMessage,
  broadcastTeamMessage,
  createDirectChatMessage,
  createTeamChatMessage,
  serializeChatMessageRecord,
} from "@/lib/chat-messages-server";
import { prisma } from "@/lib/prisma";
import { EMPTY_BOARD } from "@/lib/tic-tac-toe/types";
import { broadcastTttState, startTttMatch } from "@/server/games/ticTacToeEngine";
import { broadcastHangmanState, startHangmanMatch } from "@/server/games/hangmanEngine";
import {
  broadcastSpinnerState,
  createSocialSpinnerSessionRecord,
} from "@/server/games/spinnerEngine";
import { eventRoom, userRoom } from "@/server/socket/rooms";
import { tryGetIO } from "@/server/socket/io";
import { parseSocialTttSettings } from "@/lib/chat-game-ttt-settings";
import { DEFAULT_SOCIAL_HANGMAN_SETTINGS, parseSocialHangmanSettings } from "@/lib/chat-game-hangman-settings";
import { buildSocialTttSessionState } from "@/server/games/socialTttEngine";
import { buildSocialHangmanSessionState } from "@/server/games/socialHangmanEngine";
import { isSocialJsonGameKind } from "@/lib/social-games/kinds";
import { startSocialJsonGameMatch } from "@/server/games/socialGameEngine";

const SOCIAL_CHALLENGE_TITLE = "__chat_social__";
// Placeholder for the shared social challenge row; words come from the static word bank.
const SOCIAL_HANGMAN_WORDS = ["FIGMA"];
const SOCIAL_SPINNER_OPTIONS = [
  "Wireframe",
  "Prototype",
  "User research",
  "Pitch deck",
  "Logo",
  "Landing page",
  "MVP",
  "Coffee break",
];
const LOBBY_TIMEOUT_MS = 30 * 60 * 1000;

const userWithAccount = {
  include: {
    account: { select: { username: true, firstName: true, lastName: true } },
  },
} as const;

async function ensureSocialTttChallenge(eventId: string) {
  const existing = await prisma.ticTacToeChallenge.findFirst({
    where: { eventId, title: SOCIAL_CHALLENGE_TITLE },
  });
  if (existing) return existing;

  return prisma.ticTacToeChallenge.create({
    data: {
      eventId,
      title: SOCIAL_CHALLENGE_TITLE,
      mode: "CHAMPION",
      competitionFormat: "SINGLE_MATCH",
      allowGeneralParticipants: true,
      allowGroupParticipants: true,
      config: { social: true },
    },
  });
}

async function ensureSocialHangmanChallenge(eventId: string) {
  const existing = await prisma.hangmanChallenge.findFirst({
    where: { eventId, title: SOCIAL_CHALLENGE_TITLE },
  });
  if (existing) return existing;

  return prisma.hangmanChallenge.create({
    data: {
      eventId,
      title: SOCIAL_CHALLENGE_TITLE,
      mode: "CHAMPION",
      competitionFormat: "SINGLE_MATCH",
      allowGeneralParticipants: true,
      allowGroupParticipants: true,
      config: { words: SOCIAL_HANGMAN_WORDS, social: true },
    },
  });
}

async function ensureSocialSpinnerChallenge(eventId: string) {
  const existing = await prisma.spinChallenge.findFirst({
    where: { eventId, title: SOCIAL_CHALLENGE_TITLE },
  });
  if (existing) return existing;

  return prisma.spinChallenge.create({
    data: {
      eventId,
      title: SOCIAL_CHALLENGE_TITLE,
      config: { options: SOCIAL_SPINNER_OPTIONS },
      participationMode: "CONCURRENT",
      allowGeneralParticipants: true,
      allowGroupParticipants: true,
    },
  });
}

function parseInvitedSpectatorIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
}

async function loadSession(sessionId: string) {
  return prisma.chatGameSession.findUnique({
    where: { id: sessionId },
    include: {
      host: userWithAccount,
      participants: { include: { user: userWithAccount } },
      team: { select: { id: true, letter: true } },
      tttMatch: {
        select: {
          challengeId: true,
          state: true,
          currentTurn: true,
          playerXUserId: true,
          playerOUserId: true,
        },
      },
      hangmanMatch: {
        select: {
          challengeId: true,
          state: true,
          currentTurn: true,
          playerXUserId: true,
          playerOUserId: true,
        },
      },
      spinnerSession: { select: { challengeId: true } },
      socialMatch: { select: { id: true, kind: true, status: true, state: true } },
    },
  });
}

async function expireStaleLobbyIfNeeded(
  session: NonNullable<Awaited<ReturnType<typeof loadSession>>>,
  eventSlug: string,
) {
  if (session.status !== "LOBBY") return session;
  if (Date.now() - session.createdAt.getTime() < LOBBY_TIMEOUT_MS) return session;

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { status: "CANCELLED" },
  });
  const refreshed = await loadSession(session.id);
  if (refreshed) await updateSessionMessage(eventSlug, refreshed);
  const io = tryGetIO();
  if (io && refreshed) await broadcastChatGameSession(io, eventSlug, session.id);
  return refreshed;
}

function playerSummary(
  user: {
    id: string;
    account: { firstName: string; lastName: string };
  },
  slot?: "X" | "O",
) {
  return {
    userId: user.id,
    firstName: user.account.firstName,
    lastName: user.account.lastName,
    ...(slot ? { slot } : {}),
  };
}

function lobbyStatus(
  status: string,
): ChatGameMessageBody["status"] {
  if (status === "LIVE") return "live";
  if (status === "ENDED") return "ended";
  if (status === "CANCELLED") return "cancelled";
  return "lobby";
}

function buildLobbyText(params: {
  gameKind: ChatGameKind;
  status: ChatGameMessageBody["status"];
  hostFirstName: string;
  players: ChatGameMessageBody["players"];
  maxPlayers: number;
}): string {
  const label = chatGameTitle(params.gameKind);
  if (params.status === "lobby") {
    if (params.players.length < params.maxPlayers) {
      const needed = params.maxPlayers - params.players.length;
      return `${params.hostFirstName} started ${label} — waiting for ${needed} more player${needed === 1 ? "" : "s"}.`;
    }
    return `${params.hostFirstName} started ${label} — ready to play.`;
  }
  if (params.status === "live") return "Match is live.";
  if (params.status === "ended") return "Match finished.";
  return "Game update.";
}

async function findActiveDmGameBetweenUsers(
  eventId: string,
  userA: string,
  userB: string,
) {
  return prisma.chatGameSession.findFirst({
    where: {
      eventId,
      channel: "DM",
      status: { in: ["LOBBY", "LIVE"] },
      OR: [
        { hostUserId: userA, dmPeerUserId: userB },
        { hostUserId: userB, dmPeerUserId: userA },
      ],
    },
  });
}

async function socialMatchResultSummary(
  session: NonNullable<Awaited<ReturnType<typeof loadSession>>>,
): Promise<string | null> {
  if (session.status !== "ENDED") return null;

  if (session.tttMatchId) {
    const match = await prisma.ticTacToeMatch.findUnique({
      where: { id: session.tttMatchId },
      include: {
        playerX: { select: { account: { select: { firstName: true } } } },
        playerO: { select: { account: { select: { firstName: true } } } },
      },
    });
    if (!match || match.state !== "FINISHED") return null;
    const xName = match.playerX?.account.firstName ?? "Player X";
    const oName = match.playerO?.account.firstName ?? "Player O";
    if (match.isDraw) return `${xName} vs ${oName} · Draw`;
    const winner =
      match.winnerUserId === match.playerXUserId ? match.playerX : match.playerO;
    return `${xName} vs ${oName} · ${winner?.account.firstName ?? "Winner"} wins`;
  }

  if (session.hangmanMatchId) {
    const match = await prisma.hangmanMatch.findUnique({
      where: { id: session.hangmanMatchId },
      include: {
        playerX: { select: { account: { select: { firstName: true } } } },
        playerO: { select: { account: { select: { firstName: true } } } },
      },
    });
    if (!match || match.state !== "FINISHED") return null;
    const xName = match.playerX?.account.firstName ?? "Player X";
    const oName = match.playerO?.account.firstName ?? "Player O";
    if (match.winnerUserId === null) return `${xName} vs ${oName} · Draw`;
    const winner =
      match.winnerUserId === match.playerXUserId ? match.playerX : match.playerO;
    return `${xName} vs ${oName} · ${winner?.account.firstName ?? "Winner"} wins`;
  }

  if (session.socialMatchId) {
    const match = await prisma.socialGameMatch.findUnique({
      where: { id: session.socialMatchId },
    });
    if (!match || match.status !== "FINISHED") return null;
    const players = session.participants.filter((participant) => participant.role === "player");
    const names = players.map((participant) => participant.user.account.firstName).join(" vs ");
    if (match.winnerUserId) {
      const winner = players.find((participant) => participant.userId === match.winnerUserId);
      return `${names} · ${winner?.user.account.firstName ?? "Winner"} wins`;
    }
    return `${names} · Draw`;
  }

  return null;
}

async function resolveChatGameText(
  session: NonNullable<Awaited<ReturnType<typeof loadSession>>>,
): Promise<string> {
  const players = session.participants
    .filter((participant) => participant.role === "player")
    .map((participant) =>
      playerSummary(
        participant.user,
        participant.playerSlot === "X" || participant.playerSlot === "O"
          ? participant.playerSlot
          : undefined,
      ),
    );
  const status = lobbyStatus(session.status);
  const gameKind = isChatGameKind(session.kind) ? session.kind : "tic_tac_toe";

  if (status === "ended") {
    const summary = await socialMatchResultSummary(session);
    if (summary) return summary;
  }

  if (status === "live" && gameKind === "tic_tac_toe" && session.scoreX + session.scoreO > 0) {
    const settings = parseSocialTttSettings(session.settings);
    if (settings.seriesMode === "race") {
      const xPlayer = players.find((player) => player.slot === "X");
      const oPlayer = players.find((player) => player.slot === "O");
      return `Race in progress · ${xPlayer?.firstName ?? "X"} ${session.scoreX} – ${session.scoreO} ${oPlayer?.firstName ?? "O"}`;
    }
  }

  if (status === "live" && gameKind === "hangman" && session.scoreX + session.scoreO > 0) {
    const settings = parseSocialHangmanSettings(session.settings);
    if (settings.seriesMode === "race") {
      const xPlayer = players.find((player) => player.slot === "X");
      const oPlayer = players.find((player) => player.slot === "O");
      return `Race in progress · ${xPlayer?.firstName ?? "X"} ${session.scoreX} – ${session.scoreO} ${oPlayer?.firstName ?? "O"}`;
    }
  }

  return buildLobbyText({
    gameKind,
    status,
    hostFirstName: session.host.account.firstName,
    players,
    maxPlayers: session.maxPlayers,
  });
}

export function buildChatGameMessageBody(
  session: {
  id: string;
  kind: string;
  hostUserId: string;
  host: { account: { firstName: string } };
  joinPolicy: string;
  maxPlayers: number;
  status: string;
  tttMatchId: string | null;
  hangmanMatchId: string | null;
  spinnerSessionId: string | null;
  socialMatchId: string | null;
  participants: Array<{
    role: string;
    playerSlot: string | null;
    user: { id: string; account: { firstName: string; lastName: string } };
  }>;
},
  options?: { text?: string },
): ChatGameMessageBody {
  const players = session.participants
    .filter((participant) => participant.role === "player")
    .map((participant) =>
      playerSummary(
        participant.user,
        participant.playerSlot === "X" || participant.playerSlot === "O"
          ? participant.playerSlot
          : undefined,
      ),
    );
  const spectatorCount = session.participants.filter(
    (participant) => participant.role === "spectator",
  ).length;
  const status = lobbyStatus(session.status);
  const gameKind = isChatGameKind(session.kind) ? session.kind : "tic_tac_toe";
  const matchId =
    session.tttMatchId ?? session.hangmanMatchId ?? session.spinnerSessionId ?? session.socialMatchId;

  return {
    type: "chat_game",
    sessionId: session.id,
    gameKind,
    title: chatGameTitle(gameKind),
    status,
    hostUserId: session.hostUserId,
    hostFirstName: session.host.account.firstName,
    joinPolicy: session.joinPolicy === "open" ? "open" : "invite_only",
    maxPlayers: session.maxPlayers,
    players,
    spectatorCount,
    matchId: matchId ?? undefined,
    text:
      options?.text ??
      buildLobbyText({
        gameKind,
        status,
        hostFirstName: session.host.account.firstName,
        players,
        maxPlayers: session.maxPlayers,
      }),
  };
}

async function buildChatGameMessageBodyForSession(
  session: NonNullable<Awaited<ReturnType<typeof loadSession>>>,
): Promise<ChatGameMessageBody> {
  const text = await resolveChatGameText(session);
  return buildChatGameMessageBody(session, { text });
}

export async function buildChatGameSessionSnapshot(
  sessionId: string,
): Promise<ChatGameSessionSnapshot | null> {
  const session = await loadSession(sessionId);
  if (!session) return null;

  const body = await buildChatGameMessageBodyForSession(session);
  const challengeId =
    session.tttMatch?.challengeId ??
    session.hangmanMatch?.challengeId ??
    session.spinnerSession?.challengeId ??
    session.socialMatchId ??
    null;
  const matchId =
    session.tttMatchId ?? session.hangmanMatchId ?? session.spinnerSessionId ?? session.socialMatchId;
  const socialTtt =
    session.kind === "tic_tac_toe"
      ? buildSocialTttSessionState({
          kind: session.kind,
          settings: session.settings,
          scoreX: session.scoreX,
          scoreO: session.scoreO,
          turnDeadlineAt: session.turnDeadlineAt,
          tttMatch: session.tttMatch,
        })
      : null;
  const socialHangman =
    session.kind === "hangman"
      ? buildSocialHangmanSessionState({
          kind: session.kind,
          settings: session.settings,
          scoreX: session.scoreX,
          scoreO: session.scoreO,
          turnDeadlineAt: session.turnDeadlineAt,
          hangmanMatch: session.hangmanMatch,
        })
      : null;

  return {
    sessionId: session.id,
    eventId: session.eventId,
    kind: body.gameKind,
    source: session.source as "social" | "official",
    hostUserId: session.hostUserId,
    hostFirstName: session.host.account.firstName,
    channel: session.channel,
    teamId: session.teamId,
    dmPeerUserId: session.dmPeerUserId,
    messageId: session.messageId,
    joinPolicy: body.joinPolicy,
    maxPlayers: session.maxPlayers,
    status: body.status,
    matchId,
    challengeId,
    players: body.players,
    spectatorCount: body.spectatorCount,
    title: body.title,
    text: body.text,
    serverNow: Date.now(),
    ...(socialTtt ? { socialTtt } : {}),
    ...(socialHangman ? { socialHangman } : {}),
  };
}

export async function loadChatGameSessionForSnapshot(sessionId: string) {
  return loadSession(sessionId);
}

export async function updateSessionMessage(
  eventSlug: string,
  session: NonNullable<Awaited<ReturnType<typeof loadSession>>>,
) {
  if (!session.messageId) return null;

  const body = serializeChatGameMessage(await buildChatGameMessageBodyForSession(session));
  const message = await prisma.message.update({
    where: { id: session.messageId },
    data: { body },
    include: {
      user: {
        select: {
          account: { select: { username: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  const serialized = serializeChatMessageRecord(message);
  if (session.channel === "DM" && session.dmPeerUserId) {
    broadcastDirectMessage(session.hostUserId, session.dmPeerUserId, serialized);
  } else if (session.channel === "TEAM" && session.team) {
    broadcastTeamMessage(eventSlug, session.team.letter, serialized);
  }
  return serialized;
}

export async function broadcastChatGameSession(
  io: SocketIOServer,
  eventSlug: string,
  sessionId: string,
) {
  const snapshot = await buildChatGameSessionSnapshot(sessionId);
  if (!snapshot) return null;

  io.to(eventRoom(eventSlug)).emit("chat:game:state", snapshot);

  const session = await loadSession(sessionId);
  if (session?.channel === "DM" && session.dmPeerUserId) {
    io.to(userRoom(session.hostUserId)).emit("chat:game:state", snapshot);
    io.to(userRoom(session.dmPeerUserId)).emit("chat:game:state", snapshot);
  } else if (session?.channel === "TEAM" && session.team) {
    const { teamRoom } = await import("@/server/socket/rooms");
    io.to(teamRoom(eventSlug, session.team.letter)).emit("chat:game:state", snapshot);
  }

  return snapshot;
}

export async function broadcastChatGameRematch(
  io: SocketIOServer,
  params: {
    fromSessionId: string;
    playerUserIds: string[];
    session: ChatGameSessionSnapshot;
  },
) {
  const payload = {
    fromSessionId: params.fromSessionId,
    session: params.session,
  };

  for (const userId of params.playerUserIds) {
    io.to(userRoom(userId)).emit("chat:game:rematch", payload);
  }
}

export async function createDmTicTacToeSession(params: {
  eventId: string;
  eventSlug: string;
  hostUserId: string;
  peerUserId: string;
}) {
  await assertChatSocialGameAllowed(params.eventId, "DM");
  if (params.hostUserId === params.peerUserId) {
    throw new Error("Pick someone else to play with.");
  }

  const peer = await prisma.user.findFirst({
    where: { id: params.peerUserId, eventId: params.eventId },
    select: { id: true },
  });
  if (!peer) throw new Error("User not found.");

  const activeLobby = await findActiveDmGameBetweenUsers(
    params.eventId,
    params.hostUserId,
    params.peerUserId,
  );
  if (activeLobby) throw new Error("You already have an active game with this person.");

  const dmDefaults = getChatGameDefaults("tic_tac_toe", { channel: "DM" });

  const session = await prisma.chatGameSession.create({
    data: {
      eventId: params.eventId,
      kind: "tic_tac_toe",
      source: "social",
      hostUserId: params.hostUserId,
      channel: "DM",
      dmPeerUserId: params.peerUserId,
      joinPolicy: dmDefaults.joinPolicy,
      maxPlayers: dmDefaults.maxPlayers,
      status: "LOBBY",
      participants: {
        create: {
          userId: params.hostUserId,
          role: "player",
          playerSlot: "X",
        },
      },
    },
    include: {
      host: userWithAccount,
      participants: { include: { user: userWithAccount } },
      team: { select: { id: true, letter: true } },
    },
  });

  const lobbyBody = serializeChatGameMessage(buildChatGameMessageBody(session));
  const chatMessage = await createDirectChatMessage(
    params.eventId,
    params.hostUserId,
    params.peerUserId,
    lobbyBody,
  );

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { messageId: chatMessage.id },
  });

  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, params.eventSlug, session.id);

  return buildChatGameSessionSnapshot(session.id);
}

export async function createTeamTicTacToeSession(params: {
  eventId: string;
  eventSlug: string;
  hostUserId: string;
  teamId: string;
}) {
  await assertChatSocialGameAllowed(params.eventId, "TEAM");

  const host = await prisma.user.findFirst({
    where: { id: params.hostUserId, eventId: params.eventId, teamId: params.teamId },
    select: { id: true },
  });
  if (!host) throw new Error("You must be on this team to start a game.");

  const team = await prisma.team.findFirst({
    where: { id: params.teamId, eventId: params.eventId },
    select: { id: true, letter: true },
  });
  if (!team) throw new Error("Team not found.");

  const activeLobby = await prisma.chatGameSession.findFirst({
    where: {
      eventId: params.eventId,
      channel: "TEAM",
      teamId: params.teamId,
      status: { in: ["LOBBY", "LIVE"] },
    },
  });
  if (activeLobby) throw new Error("This team already has an active game.");

  const teamDefaults = getChatGameDefaults("tic_tac_toe", { channel: "TEAM", openLobby: true });

  const session = await prisma.chatGameSession.create({
    data: {
      eventId: params.eventId,
      kind: "tic_tac_toe",
      source: "social",
      hostUserId: params.hostUserId,
      channel: "TEAM",
      teamId: params.teamId,
      joinPolicy: teamDefaults.joinPolicy,
      maxPlayers: teamDefaults.maxPlayers,
      status: "LOBBY",
      participants: {
        create: {
          userId: params.hostUserId,
          role: "player",
          playerSlot: "X",
        },
      },
    },
    include: {
      host: userWithAccount,
      participants: { include: { user: userWithAccount } },
      team: { select: { id: true, letter: true } },
    },
  });

  const lobbyBody = serializeChatGameMessage(buildChatGameMessageBody(session));
  const chatMessage = await createTeamChatMessage(
    params.eventId,
    params.eventSlug,
    params.hostUserId,
    params.teamId,
    lobbyBody,
  );

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { messageId: chatMessage.id },
  });

  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, params.eventSlug, session.id);

  return buildChatGameSessionSnapshot(session.id);
}

async function userCanAccessSession(
  session: NonNullable<Awaited<ReturnType<typeof loadSession>>>,
  userId: string,
): Promise<boolean> {
  if (session.participants.some((participant) => participant.userId === userId)) {
    return true;
  }
  if (parseInvitedSpectatorIds(session.invitedSpectatorIds).includes(userId)) {
    return true;
  }
  if (session.channel === "DM") {
    return session.hostUserId === userId || session.dmPeerUserId === userId;
  }
  if (session.channel === "TEAM" && session.teamId) {
    const member = await prisma.user.findFirst({
      where: { id: userId, eventId: session.eventId, teamId: session.teamId },
      select: { id: true },
    });
    return Boolean(member);
  }
  return false;
}

function nextOpenPlayerSlot(
  session: NonNullable<Awaited<ReturnType<typeof loadSession>>>,
): string | null {
  const players = session.participants.filter((participant) => participant.role === "player");
  if (players.length >= session.maxPlayers) return null;

  if (isSocialJsonGameKind(session.kind)) {
    const used = new Set(players.map((participant) => participant.playerSlot).filter(Boolean));
    for (let seat = 0; seat < session.maxPlayers; seat += 1) {
      const slot = String(seat);
      if (!used.has(slot)) return slot;
    }
    return null;
  }

  if (session.kind === "spinner") return "O";
  if (players.some((participant) => participant.playerSlot === "O")) return null;
  return "O";
}

function shouldAutoStartAfterJoin(
  session: NonNullable<Awaited<ReturnType<typeof loadSession>>>,
  playersAfterJoin: number,
): boolean {
  if (session.kind === "spinner") {
    return session.channel === "DM" && playersAfterJoin >= 2;
  }
  return playersAfterJoin >= session.maxPlayers;
}

async function startSocialGameForSession(
  io: SocketIOServer,
  session: NonNullable<Awaited<ReturnType<typeof loadSession>>>,
  params: { eventId: string; eventSlug: string },
) {
  if (session.kind === "hangman") {
    await startSocialHangmanMatch(io, {
      sessionId: session.id,
      eventId: params.eventId,
      eventSlug: params.eventSlug,
      hostUserId: session.hostUserId,
    });
    return;
  }
  if (session.kind === "spinner") {
    await startSocialSpinnerMatch(io, {
      sessionId: session.id,
      eventId: params.eventId,
      eventSlug: params.eventSlug,
      hostUserId: session.hostUserId,
    });
    return;
  }
  if (isSocialJsonGameKind(session.kind)) {
    await startSocialJsonGameMatch({
      sessionId: session.id,
      eventId: params.eventId,
      eventSlug: params.eventSlug,
    });
    return;
  }
  await startSocialTttMatch(io, {
    sessionId: session.id,
    eventId: params.eventId,
    eventSlug: params.eventSlug,
    hostUserId: session.hostUserId,
  });
}

export async function joinChatGameSession(params: {
  sessionId: string;
  eventId: string;
  eventSlug: string;
  userId: string;
  asSpectator?: boolean;
}) {
  let session = await loadSession(params.sessionId);
  if (!session || session.eventId !== params.eventId) {
    throw new Error("Game not found.");
  }
  session = (await expireStaleLobbyIfNeeded(session, params.eventSlug)) ?? session;
  if (session.status === "ENDED" || session.status === "CANCELLED") {
    throw new Error("This game has ended.");
  }

  const existing = session.participants.find((participant) => participant.userId === params.userId);
  if (existing) {
    return buildChatGameSessionSnapshot(session.id);
  }

  if (session.channel === "TEAM" && session.teamId) {
    const onTeam = await prisma.user.findFirst({
      where: { id: params.userId, eventId: params.eventId, teamId: session.teamId },
      select: { id: true },
    });
    if (!onTeam) throw new Error("Only team members can join this game.");
  }

  if (session.channel === "DM") {
    const canAccessDm =
      params.userId === session.dmPeerUserId ||
      params.userId === session.hostUserId ||
      parseInvitedSpectatorIds(session.invitedSpectatorIds).includes(params.userId);
    if (!canAccessDm) throw new Error("You are not part of this conversation.");
  }

  const playerCount = session.participants.filter((participant) => participant.role === "player")
    .length;
  const openSlot = nextOpenPlayerSlot(session);

  const joiningAsSpectator =
    params.asSpectator || playerCount >= session.maxPlayers || !openSlot;

  if (!joiningAsSpectator && session.status !== "LOBBY") {
    throw new Error("This game is no longer accepting players.");
  }

  if (joiningAsSpectator) {
    if (!(await userCanAccessSession(session, params.userId))) {
      throw new Error("You cannot watch this game.");
    }
    await prisma.chatGameParticipant.create({
      data: {
        sessionId: session.id,
        userId: params.userId,
        role: "spectator",
      },
    });
    const updated = await loadSession(session.id);
    if (!updated) throw new Error("Game not found.");
    await updateSessionMessage(params.eventSlug, updated);
    const io = tryGetIO();
    if (io) await broadcastChatGameSession(io, params.eventSlug, session.id);
    return buildChatGameSessionSnapshot(session.id);
  }

  await prisma.chatGameParticipant.create({
    data: {
      sessionId: session.id,
      userId: params.userId,
      role: "player",
      playerSlot: openSlot,
    },
  });

  const updated = await loadSession(session.id);
  if (!updated) throw new Error("Game not found.");

  await updateSessionMessage(params.eventSlug, updated);

  const playersAfterJoin = updated.participants.filter(
    (participant) => participant.role === "player",
  ).length;

  const io = tryGetIO();
  if (io) {
    await broadcastChatGameSession(io, params.eventSlug, session.id);
    if (updated.status === "LOBBY" && shouldAutoStartAfterJoin(updated, playersAfterJoin)) {
      await startSocialGameForSession(io, updated, {
        eventId: params.eventId,
        eventSlug: params.eventSlug,
      });
    }
  }

  return buildChatGameSessionSnapshot(session.id);
}

export async function startSocialTttMatch(
  io: SocketIOServer,
  params: {
    sessionId: string;
    eventId: string;
    eventSlug: string;
    hostUserId: string;
  },
) {
  const session = await loadSession(params.sessionId);
  if (!session || session.eventId !== params.eventId) {
    throw new Error("Game not found.");
  }
  if (session.tttMatchId) {
    return broadcastTttState(io, session.tttMatchId, params.eventSlug);
  }

  const players = session.participants.filter((participant) => participant.role === "player");
  if (players.length < 2) {
    throw new Error("Waiting for another player.");
  }

  const playerX = players.find((participant) => participant.playerSlot === "X") ?? players[0];
  const playerO = players.find((participant) => participant.playerSlot === "O") ?? players[1];

  const challenge = await ensureSocialTttChallenge(params.eventId);
  const match = await prisma.ticTacToeMatch.create({
    data: {
      challengeId: challenge.id,
      eventId: params.eventId,
      isSocial: true,
      playerXUserId: playerX.userId,
      playerOUserId: playerO.userId,
      championXUserId: playerX.userId,
      championOUserId: playerO.userId,
      board: EMPTY_BOARD,
      state: "WAITING",
    },
  });

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { tttMatchId: match.id, status: "LIVE" },
  });

  const refreshed = await loadSession(session.id);
  if (refreshed) await updateSessionMessage(params.eventSlug, refreshed);

  await startTttMatch(io, match.id, params.eventId, params.eventSlug, params.hostUserId);
  await broadcastChatGameSession(io, params.eventSlug, session.id);

  return broadcastTttState(io, match.id, params.eventSlug);
}

export async function completeSocialChatGameFromMatch(matchId: string, eventSlug: string) {
  const session =
    (await prisma.chatGameSession.findFirst({
      where: { tttMatchId: matchId },
      include: {
        host: userWithAccount,
        participants: { include: { user: userWithAccount } },
        team: { select: { id: true, letter: true } },
      },
    })) ??
    (await prisma.chatGameSession.findFirst({
      where: { hangmanMatchId: matchId },
      include: {
        host: userWithAccount,
        participants: { include: { user: userWithAccount } },
        team: { select: { id: true, letter: true } },
      },
    })) ??
    (await prisma.chatGameSession.findFirst({
      where: { socialMatchId: matchId },
      include: {
        host: userWithAccount,
        participants: { include: { user: userWithAccount } },
        team: { select: { id: true, letter: true } },
      },
    }));
  if (!session) return;

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { status: "ENDED" },
  });

  const refreshed = await loadSession(session.id);
  if (refreshed) await updateSessionMessage(eventSlug, refreshed);

  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, eventSlug, session.id);
}

export async function completeSocialJsonGame(matchId: string, eventSlug: string) {
  return completeSocialChatGameFromMatch(matchId, eventSlug);
}

export async function createDmSocialJsonSession(params: {
  eventId: string;
  eventSlug: string;
  hostUserId: string;
  peerUserId: string;
  kind: ChatGameKind;
}) {
  if (!isSocialJsonGameKind(params.kind)) {
    throw new Error("Unsupported game type.");
  }

  await assertChatSocialGameAllowed(params.eventId, "DM");
  if (params.hostUserId === params.peerUserId) {
    throw new Error("Pick someone else to play with.");
  }

  const peer = await prisma.user.findFirst({
    where: { id: params.peerUserId, eventId: params.eventId },
    select: { id: true },
  });
  if (!peer) throw new Error("User not found.");

  const activeLobby = await findActiveDmGameBetweenUsers(
    params.eventId,
    params.hostUserId,
    params.peerUserId,
  );
  if (activeLobby) throw new Error("You already have an active game with this person.");

  const dmDefaults = getChatGameDefaults(params.kind, { channel: "DM" });

  const session = await prisma.chatGameSession.create({
    data: {
      eventId: params.eventId,
      kind: params.kind,
      source: "social",
      hostUserId: params.hostUserId,
      channel: "DM",
      dmPeerUserId: params.peerUserId,
      joinPolicy: dmDefaults.joinPolicy,
      maxPlayers: dmDefaults.maxPlayers,
      status: "LOBBY",
      participants: {
        create: {
          userId: params.hostUserId,
          role: "player",
          playerSlot: "0",
        },
      },
    },
    include: {
      host: userWithAccount,
      participants: { include: { user: userWithAccount } },
      team: { select: { id: true, letter: true } },
    },
  });

  const lobbyBody = serializeChatGameMessage(buildChatGameMessageBody(session));
  const chatMessage = await createDirectChatMessage(
    params.eventId,
    params.hostUserId,
    params.peerUserId,
    lobbyBody,
  );

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { messageId: chatMessage.id },
  });

  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, params.eventSlug, session.id);

  return buildChatGameSessionSnapshot(session.id);
}

export async function createTeamSocialJsonSession(params: {
  eventId: string;
  eventSlug: string;
  hostUserId: string;
  teamId: string;
  kind: ChatGameKind;
}) {
  if (!isSocialJsonGameKind(params.kind)) {
    throw new Error("Unsupported game type.");
  }

  await assertChatSocialGameAllowed(params.eventId, "TEAM");

  const host = await prisma.user.findFirst({
    where: { id: params.hostUserId, eventId: params.eventId, teamId: params.teamId },
    select: { id: true },
  });
  if (!host) throw new Error("You must be on this team to start a game.");

  const team = await prisma.team.findFirst({
    where: { id: params.teamId, eventId: params.eventId },
    select: { id: true, letter: true },
  });
  if (!team) throw new Error("Team not found.");

  const activeLobby = await prisma.chatGameSession.findFirst({
    where: {
      eventId: params.eventId,
      channel: "TEAM",
      teamId: params.teamId,
      status: { in: ["LOBBY", "LIVE"] },
    },
  });
  if (activeLobby) throw new Error("This team already has an active game.");

  const teamDefaults = getChatGameDefaults(params.kind, { channel: "TEAM", openLobby: true });

  const session = await prisma.chatGameSession.create({
    data: {
      eventId: params.eventId,
      kind: params.kind,
      source: "social",
      hostUserId: params.hostUserId,
      channel: "TEAM",
      teamId: params.teamId,
      joinPolicy: teamDefaults.joinPolicy,
      maxPlayers: teamDefaults.maxPlayers,
      status: "LOBBY",
      participants: {
        create: {
          userId: params.hostUserId,
          role: "player",
          playerSlot: "0",
        },
      },
    },
    include: {
      host: userWithAccount,
      participants: { include: { user: userWithAccount } },
      team: { select: { id: true, letter: true } },
    },
  });

  const lobbyBody = serializeChatGameMessage(buildChatGameMessageBody(session));
  const chatMessage = await createTeamChatMessage(
    params.eventId,
    params.eventSlug,
    params.hostUserId,
    params.teamId,
    lobbyBody,
  );

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { messageId: chatMessage.id },
  });

  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, params.eventSlug, session.id);

  return buildChatGameSessionSnapshot(session.id);
}

export async function createDmHangmanSession(params: {
  eventId: string;
  eventSlug: string;
  hostUserId: string;
  peerUserId: string;
}) {
  await assertChatSocialGameAllowed(params.eventId, "DM");
  if (params.hostUserId === params.peerUserId) {
    throw new Error("Pick someone else to play with.");
  }

  const peer = await prisma.user.findFirst({
    where: { id: params.peerUserId, eventId: params.eventId },
    select: { id: true },
  });
  if (!peer) throw new Error("User not found.");

  const activeLobby = await findActiveDmGameBetweenUsers(
    params.eventId,
    params.hostUserId,
    params.peerUserId,
  );
  if (activeLobby) throw new Error("You already have an active game with this person.");

  const dmDefaults = getChatGameDefaults("hangman", { channel: "DM" });

  const session = await prisma.chatGameSession.create({
    data: {
      eventId: params.eventId,
      kind: "hangman",
      source: "social",
      hostUserId: params.hostUserId,
      channel: "DM",
      dmPeerUserId: params.peerUserId,
      joinPolicy: dmDefaults.joinPolicy,
      maxPlayers: dmDefaults.maxPlayers,
      status: "LOBBY",
      settings: DEFAULT_SOCIAL_HANGMAN_SETTINGS as object,
      participants: {
        create: {
          userId: params.hostUserId,
          role: "player",
          playerSlot: "X",
        },
      },
    },
    include: {
      host: userWithAccount,
      participants: { include: { user: userWithAccount } },
      team: { select: { id: true, letter: true } },
    },
  });

  const lobbyBody = serializeChatGameMessage(buildChatGameMessageBody(session));
  const chatMessage = await createDirectChatMessage(
    params.eventId,
    params.hostUserId,
    params.peerUserId,
    lobbyBody,
  );

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { messageId: chatMessage.id },
  });

  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, params.eventSlug, session.id);

  return buildChatGameSessionSnapshot(session.id);
}

export async function createTeamHangmanSession(params: {
  eventId: string;
  eventSlug: string;
  hostUserId: string;
  teamId: string;
}) {
  await assertChatSocialGameAllowed(params.eventId, "TEAM");

  const host = await prisma.user.findFirst({
    where: { id: params.hostUserId, eventId: params.eventId, teamId: params.teamId },
    select: { id: true },
  });
  if (!host) throw new Error("You must be on this team to start a game.");

  const team = await prisma.team.findFirst({
    where: { id: params.teamId, eventId: params.eventId },
    select: { id: true, letter: true },
  });
  if (!team) throw new Error("Team not found.");

  const activeLobby = await prisma.chatGameSession.findFirst({
    where: {
      eventId: params.eventId,
      channel: "TEAM",
      teamId: params.teamId,
      status: { in: ["LOBBY", "LIVE"] },
    },
  });
  if (activeLobby) throw new Error("This team already has an active game.");

  const teamDefaults = getChatGameDefaults("hangman", { channel: "TEAM", openLobby: true });

  const session = await prisma.chatGameSession.create({
    data: {
      eventId: params.eventId,
      kind: "hangman",
      source: "social",
      hostUserId: params.hostUserId,
      channel: "TEAM",
      teamId: params.teamId,
      joinPolicy: teamDefaults.joinPolicy,
      maxPlayers: teamDefaults.maxPlayers,
      status: "LOBBY",
      settings: DEFAULT_SOCIAL_HANGMAN_SETTINGS as object,
      participants: {
        create: {
          userId: params.hostUserId,
          role: "player",
          playerSlot: "X",
        },
      },
    },
    include: {
      host: userWithAccount,
      participants: { include: { user: userWithAccount } },
      team: { select: { id: true, letter: true } },
    },
  });

  const lobbyBody = serializeChatGameMessage(buildChatGameMessageBody(session));
  const chatMessage = await createTeamChatMessage(
    params.eventId,
    params.eventSlug,
    params.hostUserId,
    params.teamId,
    lobbyBody,
  );

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { messageId: chatMessage.id },
  });

  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, params.eventSlug, session.id);

  return buildChatGameSessionSnapshot(session.id);
}

export async function startSocialHangmanMatch(
  io: SocketIOServer,
  params: {
    sessionId: string;
    eventId: string;
    eventSlug: string;
    hostUserId: string;
  },
) {
  const session = await loadSession(params.sessionId);
  if (!session || session.eventId !== params.eventId) {
    throw new Error("Game not found.");
  }
  if (session.hangmanMatchId) {
    return broadcastHangmanState(io, session.hangmanMatchId, params.eventSlug);
  }

  const players = session.participants.filter((participant) => participant.role === "player");
  if (players.length < 2) {
    throw new Error("Waiting for another player.");
  }

  const playerX = players.find((participant) => participant.playerSlot === "X") ?? players[0];
  const playerO = players.find((participant) => participant.playerSlot === "O") ?? players[1];

  const challenge = await ensureSocialHangmanChallenge(params.eventId);
  const match = await prisma.hangmanMatch.create({
    data: {
      challengeId: challenge.id,
      eventId: params.eventId,
      isSocial: true,
      playerXUserId: playerX.userId,
      playerOUserId: playerO.userId,
      championXUserId: playerX.userId,
      championOUserId: playerO.userId,
      state: "WAITING",
    },
  });

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { hangmanMatchId: match.id, status: "LIVE" },
  });

  const refreshed = await loadSession(session.id);
  if (refreshed) await updateSessionMessage(params.eventSlug, refreshed);

  await startHangmanMatch(io, match.id, params.eventId, params.eventSlug, params.hostUserId);
  await broadcastChatGameSession(io, params.eventSlug, session.id);

  return broadcastHangmanState(io, match.id, params.eventSlug);
}

export async function createDmSpinnerSession(params: {
  eventId: string;
  eventSlug: string;
  hostUserId: string;
  peerUserId: string;
}) {
  if (!isChatGameAllowedForChannel("spinner", "DM")) {
    throw new Error("Spinner is only available in team chat.");
  }
  await assertChatSocialGameAllowed(params.eventId, "DM");
  if (params.hostUserId === params.peerUserId) {
    throw new Error("Pick someone else to play with.");
  }

  const peer = await prisma.user.findFirst({
    where: { id: params.peerUserId, eventId: params.eventId },
    select: { id: true },
  });
  if (!peer) throw new Error("User not found.");

  const activeLobby = await findActiveDmGameBetweenUsers(
    params.eventId,
    params.hostUserId,
    params.peerUserId,
  );
  if (activeLobby) throw new Error("You already have an active game with this person.");

  const dmDefaults = getChatGameDefaults("spinner", { channel: "DM" });

  const session = await prisma.chatGameSession.create({
    data: {
      eventId: params.eventId,
      kind: "spinner",
      source: "social",
      hostUserId: params.hostUserId,
      channel: "DM",
      dmPeerUserId: params.peerUserId,
      joinPolicy: dmDefaults.joinPolicy,
      maxPlayers: dmDefaults.maxPlayers,
      status: "LOBBY",
      participants: {
        create: {
          userId: params.hostUserId,
          role: "player",
          playerSlot: "X",
        },
      },
    },
    include: {
      host: userWithAccount,
      participants: { include: { user: userWithAccount } },
      team: { select: { id: true, letter: true } },
    },
  });

  const lobbyBody = serializeChatGameMessage(buildChatGameMessageBody(session));
  const chatMessage = await createDirectChatMessage(
    params.eventId,
    params.hostUserId,
    params.peerUserId,
    lobbyBody,
  );

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { messageId: chatMessage.id },
  });

  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, params.eventSlug, session.id);

  return buildChatGameSessionSnapshot(session.id);
}

export async function createTeamSpinnerSession(params: {
  eventId: string;
  eventSlug: string;
  hostUserId: string;
  teamId: string;
}) {
  await assertChatSocialGameAllowed(params.eventId, "TEAM");

  const host = await prisma.user.findFirst({
    where: { id: params.hostUserId, eventId: params.eventId, teamId: params.teamId },
    select: { id: true },
  });
  if (!host) throw new Error("You must be on this team to start a game.");

  const team = await prisma.team.findFirst({
    where: { id: params.teamId, eventId: params.eventId },
    select: { id: true, letter: true },
  });
  if (!team) throw new Error("Team not found.");

  const activeLobby = await prisma.chatGameSession.findFirst({
    where: {
      eventId: params.eventId,
      channel: "TEAM",
      teamId: params.teamId,
      status: { in: ["LOBBY", "LIVE"] },
    },
  });
  if (activeLobby) throw new Error("This team already has an active game.");

  const teamDefaults = getChatGameDefaults("spinner", { channel: "TEAM", openLobby: true });

  const session = await prisma.chatGameSession.create({
    data: {
      eventId: params.eventId,
      kind: "spinner",
      source: "social",
      hostUserId: params.hostUserId,
      channel: "TEAM",
      teamId: params.teamId,
      joinPolicy: teamDefaults.joinPolicy,
      maxPlayers: teamDefaults.maxPlayers,
      status: "LOBBY",
      participants: {
        create: {
          userId: params.hostUserId,
          role: "player",
          playerSlot: "X",
        },
      },
    },
    include: {
      host: userWithAccount,
      participants: { include: { user: userWithAccount } },
      team: { select: { id: true, letter: true } },
    },
  });

  const lobbyBody = serializeChatGameMessage(buildChatGameMessageBody(session));
  const chatMessage = await createTeamChatMessage(
    params.eventId,
    params.eventSlug,
    params.hostUserId,
    params.teamId,
    lobbyBody,
  );

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { messageId: chatMessage.id },
  });

  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, params.eventSlug, session.id);

  return buildChatGameSessionSnapshot(session.id);
}

export async function startSocialSpinnerMatch(
  io: SocketIOServer,
  params: {
    sessionId: string;
    eventId: string;
    eventSlug: string;
    hostUserId: string;
  },
) {
  const session = await loadSession(params.sessionId);
  if (!session || session.eventId !== params.eventId) {
    throw new Error("Game not found.");
  }
  if (session.spinnerSessionId) {
    return broadcastSpinnerState(io, session.spinnerSessionId, params.eventSlug);
  }

  const players = session.participants.filter((participant) => participant.role === "player");
  if (players.length < 2) {
    throw new Error("Need at least two players to start.");
  }

  const challenge = await ensureSocialSpinnerChallenge(params.eventId);
  const spinnerSession = await createSocialSpinnerSessionRecord({
    challengeId: challenge.id,
    eventId: params.eventId,
    eventSlug: params.eventSlug,
    hostUserId: params.hostUserId,
    teamId: session.teamId,
  });

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { spinnerSessionId: spinnerSession.id, status: "LIVE" },
  });

  const refreshed = await loadSession(session.id);
  if (refreshed) await updateSessionMessage(params.eventSlug, refreshed);

  await broadcastSpinnerState(io, spinnerSession.id, params.eventSlug);
  await broadcastChatGameSession(io, params.eventSlug, session.id);

  return broadcastSpinnerState(io, spinnerSession.id, params.eventSlug);
}

export async function completeSocialChatGameFromSpinner(
  spinnerSessionId: string,
  eventSlug: string,
) {
  const session = await prisma.chatGameSession.findFirst({
    where: { spinnerSessionId },
    include: {
      host: userWithAccount,
      participants: { include: { user: userWithAccount } },
      team: { select: { id: true, letter: true } },
    },
  });
  if (!session) return;

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { status: "ENDED" },
  });

  const refreshed = await loadSession(session.id);
  if (refreshed) await updateSessionMessage(eventSlug, refreshed);

  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, eventSlug, session.id);
}

export async function startChatGameSessionByHost(params: {
  sessionId: string;
  eventId: string;
  eventSlug: string;
  userId: string;
}) {
  const session = await loadSession(params.sessionId);
  if (!session || session.eventId !== params.eventId) {
    throw new Error("Game not found.");
  }
  if (session.hostUserId !== params.userId) {
    throw new Error("Only the host can start this game.");
  }
  if (session.status !== "LOBBY") {
    throw new Error("This game has already started.");
  }
  if (session.kind !== "spinner" || session.channel !== "TEAM") {
    throw new Error("This game cannot be started manually.");
  }

  const playerCount = session.participants.filter(
    (participant) => participant.role === "player",
  ).length;
  if (playerCount < 2) {
    throw new Error("Need at least two players to start.");
  }

  const io = tryGetIO();
  if (!io) throw new Error("Live updates are unavailable.");

  await startSocialSpinnerMatch(io, {
    sessionId: session.id,
    eventId: params.eventId,
    eventSlug: params.eventSlug,
    hostUserId: session.hostUserId,
  });

  return buildChatGameSessionSnapshot(session.id);
}

export async function cancelChatGameSession(params: {
  sessionId: string;
  eventId: string;
  eventSlug: string;
  userId: string;
}) {
  let session = await loadSession(params.sessionId);
  if (!session || session.eventId !== params.eventId) {
    throw new Error("Game not found.");
  }

  session = (await expireStaleLobbyIfNeeded(session, params.eventSlug)) ?? session;

  if (session.status !== "LOBBY" && session.status !== "LIVE") {
    const refreshed = await loadSession(session.id);
    if (refreshed) await updateSessionMessage(params.eventSlug, refreshed);
    return buildChatGameSessionSnapshot(session.id);
  }

  const isHost = session.hostUserId === params.userId;
  const isPlayer = session.participants.some(
    (participant) => participant.userId === params.userId && participant.role === "player",
  );
  if (!isHost && !isPlayer) {
    throw new Error("You cannot cancel this game.");
  }

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { status: "CANCELLED" },
  });

  const refreshed = await loadSession(session.id);
  if (refreshed) await updateSessionMessage(params.eventSlug, refreshed);

  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, params.eventSlug, session.id);

  return buildChatGameSessionSnapshot(session.id);
}

export async function inviteSpectatorsToChatGame(params: {
  sessionId: string;
  eventId: string;
  eventSlug: string;
  userId: string;
  inviteeUserIds: string[];
}) {
  const session = await loadSession(params.sessionId);
  if (!session || session.eventId !== params.eventId) {
    throw new Error("Game not found.");
  }
  const canInvite = session.participants.some(
    (participant) => participant.userId === params.userId && participant.role === "player",
  );
  if (!canInvite) {
    throw new Error("Only players can invite spectators.");
  }

  const validUsers = await prisma.user.findMany({
    where: { eventId: params.eventId, id: { in: params.inviteeUserIds } },
    select: { id: true },
  });
  const merged = [
    ...new Set([
      ...parseInvitedSpectatorIds(session.invitedSpectatorIds),
      ...validUsers.map((user) => user.id),
    ]),
  ];

  await prisma.chatGameSession.update({
    where: { id: session.id },
    data: { invitedSpectatorIds: merged },
  });

  const io = tryGetIO();
  if (io) await broadcastChatGameSession(io, params.eventSlug, session.id);

  return buildChatGameSessionSnapshot(session.id);
}

function previousMatchPlayers(session: NonNullable<Awaited<ReturnType<typeof loadSession>>>) {
  return session.participants.filter((participant) => participant.role === "player");
}

function resolveDmPeerForRematch(
  session: NonNullable<Awaited<ReturnType<typeof loadSession>>>,
  requesterUserId: string,
) {
  const peerFromPlayers = previousMatchPlayers(session).find(
    (participant) => participant.userId !== requesterUserId,
  )?.userId;
  if (peerFromPlayers) return peerFromPlayers;

  if (session.dmPeerUserId && session.dmPeerUserId !== requesterUserId) {
    return session.dmPeerUserId;
  }
  if (session.hostUserId !== requesterUserId) {
    return session.hostUserId;
  }

  throw new Error("Cannot determine rematch opponent.");
}

async function seatRematchPlayers(params: {
  sessionId: string;
  eventId: string;
  eventSlug: string;
  requesterUserId: string;
  previousPlayers: ReturnType<typeof previousMatchPlayers>;
  kind: string;
  channel: string;
}) {
  const otherPlayerIds = params.previousPlayers
    .map((participant) => participant.userId)
    .filter((userId) => userId !== params.requesterUserId);

  let session = await loadSession(params.sessionId);
  if (!session) throw new Error("Game not found.");

  for (const userId of otherPlayerIds) {
    const openSlot = nextOpenPlayerSlot(session);
    if (!openSlot && params.kind !== "spinner") break;

    await prisma.chatGameParticipant.create({
      data: {
        sessionId: params.sessionId,
        userId,
        role: "player",
        playerSlot: openSlot ?? "O",
      },
    });

    session = (await loadSession(params.sessionId))!;
  }

  await updateSessionMessage(params.eventSlug, session);

  const playerCount = session.participants.filter(
    (participant) => participant.role === "player",
  ).length;

  const io = tryGetIO();
  if (io) {
    await broadcastChatGameSession(io, params.eventSlug, params.sessionId);
    if (session.status === "LOBBY" && shouldAutoStartAfterJoin(session, playerCount)) {
      await startSocialGameForSession(io, session, {
        eventId: params.eventId,
        eventSlug: params.eventSlug,
      });
    } else if (
      params.kind === "spinner" &&
      params.channel === "TEAM" &&
      session.status === "LOBBY" &&
      playerCount >= 2
    ) {
      await startSocialSpinnerMatch(io, {
        sessionId: session.id,
        eventId: params.eventId,
        eventSlug: params.eventSlug,
        hostUserId: session.hostUserId,
      });
    }
  }

  return (await buildChatGameSessionSnapshot(params.sessionId))!;
}

export async function rematchSocialChatGame(params: {
  sessionId: string;
  eventId: string;
  eventSlug: string;
  userId: string;
}) {
  const session = await loadSession(params.sessionId);
  if (!session || session.eventId !== params.eventId || session.source !== "social") {
    throw new Error("Game not found.");
  }
  if (session.status !== "ENDED") {
    throw new Error("This game has not finished yet.");
  }

  const wasPlayer = session.participants.some(
    (participant) => participant.userId === params.userId && participant.role === "player",
  );
  if (!wasPlayer) throw new Error("Only players can request a rematch.");

  const players = previousMatchPlayers(session);
  if (players.length < 2) {
    throw new Error("Not enough players for a rematch.");
  }

  if (session.channel === "DM") {
    const peerUserId = resolveDmPeerForRematch(session, params.userId);
    const existing = await findActiveDmGameBetweenUsers(
      params.eventId,
      params.userId,
      peerUserId,
    );
    if (existing && existing.id !== params.sessionId) {
      const result = await buildChatGameSessionSnapshot(existing.id);
      if (!result) throw new Error("Could not load rematch game.");
      const io = tryGetIO();
      if (io) {
        await broadcastChatGameRematch(io, {
          fromSessionId: params.sessionId,
          playerUserIds: players.map((participant) => participant.userId),
          session: result,
        });
      }
      return result;
    }
  }

  let snapshot: ChatGameSessionSnapshot;

  if (session.channel === "DM") {
    const peerUserId = resolveDmPeerForRematch(session, params.userId);
    if (session.kind === "hangman") {
      snapshot = (await createDmHangmanSession({
        eventId: params.eventId,
        eventSlug: params.eventSlug,
        hostUserId: params.userId,
        peerUserId,
      }))!;
    } else if (session.kind === "spinner") {
      throw new Error("Spinner is only available in team chat.");
    } else if (isSocialJsonGameKind(session.kind)) {
      snapshot = (await createDmSocialJsonSession({
        eventId: params.eventId,
        eventSlug: params.eventSlug,
        hostUserId: params.userId,
        peerUserId,
        kind: session.kind,
      }))!;
    } else {
      snapshot = (await createDmTicTacToeSession({
        eventId: params.eventId,
        eventSlug: params.eventSlug,
        hostUserId: params.userId,
        peerUserId,
      }))!;
    }
  } else if (session.channel === "TEAM" && session.teamId) {
    if (session.kind === "hangman") {
      snapshot = (await createTeamHangmanSession({
        eventId: params.eventId,
        eventSlug: params.eventSlug,
        hostUserId: params.userId,
        teamId: session.teamId,
      }))!;
    } else if (session.kind === "spinner") {
      snapshot = (await createTeamSpinnerSession({
        eventId: params.eventId,
        eventSlug: params.eventSlug,
        hostUserId: params.userId,
        teamId: session.teamId,
      }))!;
    } else if (isSocialJsonGameKind(session.kind)) {
      snapshot = (await createTeamSocialJsonSession({
        eventId: params.eventId,
        eventSlug: params.eventSlug,
        hostUserId: params.userId,
        teamId: session.teamId,
        kind: session.kind,
      }))!;
    } else {
      snapshot = (await createTeamTicTacToeSession({
        eventId: params.eventId,
        eventSlug: params.eventSlug,
        hostUserId: params.userId,
        teamId: session.teamId,
      }))!;
    }
  } else {
    throw new Error("Cannot rematch this game.");
  }

  if (session.kind === "tic_tac_toe") {
    const { copySocialTttSessionMeta } = await import("@/server/games/socialTttEngine");
    await copySocialTttSessionMeta(params.sessionId, snapshot.sessionId);
  }
  if (session.kind === "hangman") {
    const { copySocialHangmanSessionMeta } = await import("@/server/games/socialHangmanEngine");
    await copySocialHangmanSessionMeta(params.sessionId, snapshot.sessionId);
  }

  const result = await seatRematchPlayers({
    sessionId: snapshot.sessionId,
    eventId: params.eventId,
    eventSlug: params.eventSlug,
    requesterUserId: params.userId,
    previousPlayers: players,
    kind: session.kind,
    channel: session.channel,
  });

  const io = tryGetIO();
  if (io) {
    await broadcastChatGameRematch(io, {
      fromSessionId: params.sessionId,
      playerUserIds: players.map((participant) => participant.userId),
      session: result,
    });
  }

  return result;
}

export async function getChatGameSessionForUser(
  sessionId: string,
  userId: string,
  eventSlug?: string,
) {
  let session = await loadSession(sessionId);
  if (!session) return null;

  if (eventSlug && session.status === "LOBBY") {
    session = (await expireStaleLobbyIfNeeded(session, eventSlug)) ?? session;
  }

  if (!(await userCanAccessSession(session, userId))) return null;
  return buildChatGameSessionSnapshot(sessionId);
}

export function parseStoredChatGameMessage(body: string): ChatGameMessageBody | null {
  return parseChatGameMessageBody(body);
}
