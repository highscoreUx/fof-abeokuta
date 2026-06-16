import type { Server as SocketIOServer } from "socket.io";
import { prisma } from "@/lib/prisma";
import { postActivityChatMessage } from "@/lib/activity-chat-server";
import {
  buildWordMask,
  isLetterInWord,
  isWordComplete,
  parseHangmanWords,
  pickRandomWord,
  type HangmanMark,
  type HangmanMatchSnapshot,
  type HangmanMode,
} from "@/lib/hangman/types";
import { eventRoom, hangmanMatchRoom, teamRoom, userRoom } from "@/server/socket/rooms";
import { handleBracketGameResult } from "@/server/games/activityBracketEngine";
import { loadBracketMatchContext } from "@/lib/activity-bracket/match-context";
import { mergeSocialHangmanSettingsStorage, parseSocialHangmanSettings } from "@/lib/chat-game-hangman-settings";
import { pickSocialHangmanWord } from "@/data/social-hangman/word-bank";
import { buildSocialHangmanSessionState } from "@/server/games/socialHangmanEngine";

function parseGuessedLetters(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l) => String(l).trim().toUpperCase())
    .filter((l) => l.length === 1 && l >= "A" && l <= "Z");
}

function parseCouncilVotes(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const letter = String(v).trim().toUpperCase();
    if (letter.length === 1 && letter >= "A" && letter <= "Z") out[k] = letter;
  }
  return out;
}

function voteCounts(votes: Record<string, string>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const letter of Object.values(votes)) {
    counts[letter] = (counts[letter] ?? 0) + 1;
  }
  return counts;
}

function teamInfo(team: { id: string; letter: string; name: string; color: string }) {
  return { id: team.id, letter: team.letter, name: team.name, color: team.color };
}

function playerInfo(user: {
  id: string;
  account: { username: string; firstName: string; lastName: string };
}) {
  return {
    userId: user.id,
    username: user.account.username,
    firstName: user.account.firstName,
    lastName: user.account.lastName,
  };
}

function socialPseudoTeam(
  user: { id: string; account: { firstName: string; lastName: string } },
  mark: HangmanMark,
) {
  const initial = user.account.firstName.trim().charAt(0).toUpperCase() || mark;
  return {
    id: user.id,
    letter: initial,
    name: `${user.account.firstName} ${user.account.lastName}`.trim(),
    color: mark === "X" ? "#f97316" : "#3b82f6",
  };
}

export async function buildHangmanSnapshot(matchId: string): Promise<HangmanMatchSnapshot | null> {
  const match = await prisma.hangmanMatch.findUnique({
    where: { id: matchId },
    include: {
      challenge: true,
      teamX: true,
      teamO: true,
      playerX: {
        select: {
          id: true,
          account: { select: { username: true, firstName: true, lastName: true } },
        },
      },
      playerO: {
        select: {
          id: true,
          account: { select: { username: true, firstName: true, lastName: true } },
        },
      },
      championX: {
        select: {
          id: true,
          account: { select: { username: true, firstName: true, lastName: true } },
        },
      },
      championO: {
        select: {
          id: true,
          account: { select: { username: true, firstName: true, lastName: true } },
        },
      },
      chatSession: {
        select: {
          id: true,
          settings: true,
          scoreX: true,
          scoreO: true,
          turnDeadlineAt: true,
          kind: true,
        },
      },
    },
  });
  if (!match) return null;

  const guessedLetters = parseGuessedLetters(match.guessedLetters);
  const councilVotes = parseCouncilVotes(match.councilVotes);
  const finished = match.state === "FINISHED";
  const bracket = match.isSocial ? null : await loadBracketMatchContext(match.bracketSlotId);
  const title =
    match.challenge.title === "__chat_social__" ? "Hangman" : match.challenge.title;

  const playerX = match.playerX ? playerInfo(match.playerX) : null;
  const playerO = match.playerO ? playerInfo(match.playerO) : null;
  const socialHangman = match.chatSession
    ? buildSocialHangmanSessionState({
        kind: match.chatSession.kind,
        settings: match.chatSession.settings,
        scoreX: match.chatSession.scoreX,
        scoreO: match.chatSession.scoreO,
        turnDeadlineAt: match.chatSession.turnDeadlineAt,
        hangmanMatch: {
          state: match.state,
          currentTurn: match.currentTurn,
          playerXUserId: match.playerXUserId,
          playerOUserId: match.playerOUserId,
        },
      })
    : null;
  const maxWrongGuesses = match.isSocial
    ? (socialHangman?.settings.maxWrongGuesses ?? match.challenge.maxWrongGuesses)
    : match.challenge.maxWrongGuesses;

  return {
    matchId: match.id,
    challengeId: match.challengeId,
    challengeTitle: title,
    mode: match.challenge.mode as HangmanMode,
    state: match.state as HangmanMatchSnapshot["state"],
    wordMask: finished
      ? match.secretWord
      : buildWordMask(match.secretWord, guessedLetters),
    guessedLetters,
    wrongGuessesX: match.wrongGuessesX,
    wrongGuessesO: match.wrongGuessesO,
    maxWrongGuesses,
    currentTurn: match.currentTurn as HangmanMark,
    turnNumber: match.turnNumber,
    teamX:
      match.teamX && !match.isSocial
        ? teamInfo(match.teamX)
        : playerX
          ? socialPseudoTeam(match.playerX!, "X")
          : { id: "", letter: "X", name: "Player X", color: "#f97316" },
    teamO:
      match.teamO && !match.isSocial
        ? teamInfo(match.teamO)
        : playerO
          ? socialPseudoTeam(match.playerO!, "O")
          : { id: "", letter: "O", name: "Player O", color: "#3b82f6" },
    championX: match.championX
      ? playerInfo(match.championX)
      : null,
    championO: match.championO
      ? playerInfo(match.championO)
      : null,
    councilVotes,
    councilVoteCounts: voteCounts(councilVotes),
    winnerTeamId: match.winnerTeamId,
    winnerUserId: match.winnerUserId,
    isSocial: match.isSocial,
    playerX,
    playerO,
    chatSessionId: match.chatSession?.id ?? null,
    revealedWord: finished ? match.secretWord : null,
    bracket,
    socialHangman: socialHangman ?? undefined,
    serverNow: Date.now(),
  };
}

async function emitHangmanState(
  io: SocketIOServer,
  eventSlug: string,
  snapshot: HangmanMatchSnapshot,
) {
  const rooms = new Set<string>([hangmanMatchRoom(snapshot.matchId)]);

  if (snapshot.isSocial) {
    if (snapshot.playerX?.userId) rooms.add(userRoom(snapshot.playerX.userId));
    if (snapshot.playerO?.userId) rooms.add(userRoom(snapshot.playerO.userId));
  } else {
    rooms.add(teamRoom(eventSlug, snapshot.teamX.letter));
    rooms.add(teamRoom(eventSlug, snapshot.teamO.letter));
    rooms.add(eventRoom(eventSlug));
  }

  for (const room of rooms) {
    io.to(room).emit("hangman:state", snapshot);
  }
}

export async function broadcastHangmanState(
  io: SocketIOServer,
  matchId: string,
  eventSlug: string,
) {
  const snapshot = await buildHangmanSnapshot(matchId);
  if (!snapshot) return null;
  await emitHangmanState(io, eventSlug, snapshot);
  return snapshot;
}

export async function createHangmanMatch(
  challengeId: string,
  eventId: string,
  teamXId: string,
  teamOId: string,
) {
  if (teamXId === teamOId) throw new Error("Teams must be different.");

  const challenge = await prisma.hangmanChallenge.findFirst({
    where: { id: challengeId, eventId },
  });
  if (!challenge) throw new Error("Hangman activity not found.");

  if (challenge.competitionFormat === "CHAMPIONSHIP") {
    throw new Error("Use Start championship for bracket mode.");
  }

  const words = parseHangmanWords(challenge.config);
  if (words.length === 0) {
    throw new Error("Add at least one word before creating a match.");
  }

  return prisma.hangmanMatch.create({
    data: {
      challengeId,
      eventId,
      teamXId,
      teamOId,
      state: "WAITING",
    },
    include: { teamX: true, teamO: true, challenge: true },
  });
}

export async function startHangmanMatch(
  io: SocketIOServer,
  matchId: string,
  eventId: string,
  eventSlug: string,
  hostUserId: string,
) {
  const match = await prisma.hangmanMatch.findFirst({
    where: { id: matchId, eventId },
    include: {
      challenge: true,
      teamX: true,
      teamO: true,
      chatSession: { select: { id: true, settings: true } },
    },
  });
  if (!match) throw new Error("Match not found.");
  if (match.state !== "WAITING") throw new Error("Match already started.");

  let secretWord: string;
  if (match.isSocial) {
    const settings = parseSocialHangmanSettings(match.chatSession?.settings);
    const pick = pickSocialHangmanWord(settings);
    secretWord = pick.word;
    if (match.chatSession) {
      await prisma.chatGameSession.update({
        where: { id: match.chatSession.id },
        data: {
          settings: mergeSocialHangmanSettingsStorage(
            match.chatSession.settings,
            settings,
            pick.topicId,
          ),
        },
      });
    }
  } else {
    secretWord = pickRandomWord(parseHangmanWords(match.challenge.config));
  }

  await prisma.hangmanMatch.update({
    where: { id: matchId },
    data: {
      state: "ACTIVE",
      secretWord,
      guessedLetters: [],
      councilVotes: {},
      wrongGuessesX: 0,
      wrongGuessesO: 0,
      currentTurn: "X",
      turnNumber: 0,
    },
  });

  if (!match.isSocial) {
    await postActivityChatMessage({
      eventId,
      eventSlug,
      authorUserId: hostUserId,
      body: {
        type: "activity",
        kind: "hangman",
        sessionId: matchId,
        instanceId: match.challengeId,
        title: match.challenge.title,
        status: "live",
        action: "started",
        text: `Team ${match.teamX?.letter ?? "X"} vs Team ${match.teamO?.letter ?? "O"} — Hangman is live.`,
        metadata: { matchId, teamXId: match.teamXId, teamOId: match.teamOId },
      },
      broadcastToAllChats: true,
    });
  }

  const snapshot = await broadcastHangmanState(io, matchId, eventSlug);

  if (match.isSocial) {
    const { onSocialHangmanMatchStarted } = await import("@/server/games/socialHangmanEngine");
    await onSocialHangmanMatchStarted(io, matchId, eventSlug);
  }

  return snapshot;
}

export async function setHangmanChampion(
  io: SocketIOServer,
  params: {
    matchId: string;
    eventId: string;
    eventSlug: string;
    teamId: string;
    championUserId: string;
  },
) {
  const match = await prisma.hangmanMatch.findFirst({
    where: { id: params.matchId, eventId: params.eventId },
  });
  if (!match) throw new Error("Match not found.");
  if (match.state === "FINISHED") throw new Error("Match is finished.");

  if (match.isSocial) throw new Error("Social matches do not use champions.");

  const isX = match.teamXId === params.teamId;
  const isO = match.teamOId === params.teamId;
  if (!isX && !isO) throw new Error("Your team is not in this match.");

  const champion = await prisma.user.findFirst({
    where: { id: params.championUserId, teamId: params.teamId, eventId: params.eventId },
  });
  if (!champion) throw new Error("Champion must be on your team.");

  await prisma.hangmanMatch.update({
    where: { id: params.matchId },
    data: isX
      ? { championXUserId: params.championUserId }
      : { championOUserId: params.championUserId },
  });

  return broadcastHangmanState(io, params.matchId, params.eventSlug);
}

function currentTurnTeamId(match: {
  teamXId: string | null;
  teamOId: string | null;
  currentTurn: string;
}) {
  return match.currentTurn === "X" ? match.teamXId : match.teamOId;
}

function otherMark(turn: HangmanMark): HangmanMark {
  return turn === "X" ? "O" : "X";
}

async function applyGuess(
  io: SocketIOServer,
  matchId: string,
  eventSlug: string,
  letter: string,
) {
  const match = await prisma.hangmanMatch.findUnique({
    where: { id: matchId },
    include: { challenge: true, chatSession: { select: { settings: true } } },
  });
  if (!match || match.state !== "ACTIVE") return null;

  const normalized = letter.toUpperCase();
  const guessed = parseGuessedLetters(match.guessedLetters);
  if (guessed.includes(normalized)) return broadcastHangmanState(io, matchId, eventSlug);

  const nextGuessed = [...guessed, normalized];
  const correct = isLetterInWord(normalized, match.secretWord);
  const wordComplete = isWordComplete(match.secretWord, nextGuessed);
  const maxWrong = match.isSocial
    ? parseSocialHangmanSettings(match.chatSession?.settings).maxWrongGuesses
    : match.challenge.maxWrongGuesses;

  let wrongGuessesX = match.wrongGuessesX;
  let wrongGuessesO = match.wrongGuessesO;
  let nextTurn: HangmanMark = match.currentTurn as HangmanMark;
  let winnerTeamId: string | null = null;
  let winnerUserId: string | null = null;
  let finished = false;

  if (wordComplete) {
    if (match.isSocial) {
      winnerUserId =
        match.currentTurn === "X" ? match.playerXUserId : match.playerOUserId;
    } else {
      winnerTeamId = currentTurnTeamId(match);
    }
    finished = true;
  } else if (correct) {
    // Same side continues on correct guess.
  } else {
    if (match.currentTurn === "X") wrongGuessesX += 1;
    else wrongGuessesO += 1;

    const turnTeamOut =
      match.currentTurn === "X" ? wrongGuessesX >= maxWrong : wrongGuessesO >= maxWrong;

    if (turnTeamOut) {
      if (match.isSocial) {
        winnerUserId =
          match.currentTurn === "X" ? match.playerOUserId : match.playerXUserId;
      } else {
        winnerTeamId = match.currentTurn === "X" ? match.teamOId : match.teamXId;
      }
      finished = true;
    } else {
      nextTurn = otherMark(match.currentTurn as HangmanMark);
    }
  }

  await prisma.hangmanMatch.update({
    where: { id: matchId },
    data: {
      guessedLetters: nextGuessed,
      wrongGuessesX,
      wrongGuessesO,
      currentTurn: finished ? match.currentTurn : nextTurn,
      turnNumber: match.turnNumber + 1,
      councilVotes: {},
      state: finished ? "FINISHED" : "ACTIVE",
      winnerTeamId,
      winnerUserId: finished ? winnerUserId : null,
      finishedAt: finished ? new Date() : null,
    },
  });

  const snapshot = await broadcastHangmanState(io, matchId, eventSlug);

  if (finished && match.isSocial) {
    const winnerMark: "X" | "O" =
      winnerUserId === match.playerXUserId ? "X" : "O";
    const { handleSocialHangmanRoundEnd } = await import("@/server/games/socialHangmanEngine");
    await handleSocialHangmanRoundEnd(io, matchId, eventSlug, { winnerMark });
  } else if (!finished && match.isSocial) {
    const { onSocialHangmanGuessApplied } = await import("@/server/games/socialHangmanEngine");
    await onSocialHangmanGuessApplied(io, matchId, eventSlug);
  }

  if (finished && match.bracketSlotId) {
    await handleBracketGameResult(io, {
      gameType: "hangman",
      bracketSlotId: match.bracketSlotId,
      winnerTeamId,
      isDraw: false,
      eventId: match.eventId,
      eventSlug,
      finishedMatchId: matchId,
    });
  }

  return snapshot;
}

export async function handleHangmanGuess(
  io: SocketIOServer,
  params: {
    matchId: string;
    eventId: string;
    eventSlug: string;
    userId: string;
    teamId: string | null;
    letter: string;
  },
) {
  const match = await prisma.hangmanMatch.findFirst({
    where: { id: params.matchId, eventId: params.eventId },
    include: { challenge: true },
  });
  if (!match) throw new Error("Match not found.");
  if (match.state !== "ACTIVE") throw new Error("Match is not active.");

  const normalized = params.letter.trim().toUpperCase();
  if (normalized.length !== 1 || normalized < "A" || normalized > "Z") {
    throw new Error("Pick a letter A–Z.");
  }

  if (match.isSocial) {
    const turnUserId =
      match.currentTurn === "X" ? match.playerXUserId : match.playerOUserId;
    if (!turnUserId || params.userId !== turnUserId) {
      throw new Error("It is not your turn.");
    }
    return applyGuess(io, params.matchId, params.eventSlug, normalized);
  }

  const turnTeamId = currentTurnTeamId(match);
  if (!params.teamId || params.teamId !== turnTeamId) {
    throw new Error("It is not your team's turn.");
  }

  const mode = match.challenge.mode as HangmanMode;

  if (mode === "CHAMPION") {
    const championId =
      match.currentTurn === "X" ? match.championXUserId : match.championOUserId;
    if (!championId) throw new Error("Your team must pick a champion first.");
    if (params.userId !== championId) throw new Error("Only the team champion can guess.");
    return applyGuess(io, params.matchId, params.eventSlug, normalized);
  }

  const votes = parseCouncilVotes(match.councilVotes);
  votes[params.userId] = normalized;

  const teamMembers = await prisma.user.count({
    where: { teamId: params.teamId, eventId: params.eventId },
  });
  const counts = voteCounts(votes);
  const majority = Math.ceil(teamMembers / 2);

  let winningLetter: string | null = null;
  for (const [letter, count] of Object.entries(counts)) {
    if (count >= majority) {
      winningLetter = letter;
      break;
    }
  }

  if (winningLetter === null) {
    await prisma.hangmanMatch.update({
      where: { id: params.matchId },
      data: { councilVotes: votes },
    });
    return broadcastHangmanState(io, params.matchId, params.eventSlug);
  }

  return applyGuess(io, params.matchId, params.eventSlug, winningLetter);
}

export async function listHangmanMatchesForEvent(eventId: string, challengeId?: string) {
  return prisma.hangmanMatch.findMany({
    where: { eventId, ...(challengeId ? { challengeId } : {}) },
    include: { teamX: true, teamO: true, challenge: true },
    orderBy: { createdAt: "desc" },
  });
}
