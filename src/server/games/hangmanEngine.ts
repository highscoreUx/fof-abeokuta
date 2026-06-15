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
import { eventRoom, hangmanMatchRoom, teamRoom } from "@/server/socket/rooms";
import { handleBracketGameResult } from "@/server/games/activityBracketEngine";
import { loadBracketMatchContext } from "@/lib/activity-bracket/match-context";

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

export async function buildHangmanSnapshot(matchId: string): Promise<HangmanMatchSnapshot | null> {
  const match = await prisma.hangmanMatch.findUnique({
    where: { id: matchId },
    include: {
      challenge: true,
      teamX: true,
      teamO: true,
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
    },
  });
  if (!match) return null;

  const guessedLetters = parseGuessedLetters(match.guessedLetters);
  const councilVotes = parseCouncilVotes(match.councilVotes);
  const finished = match.state === "FINISHED";
  const bracket = await loadBracketMatchContext(match.bracketSlotId);

  return {
    matchId: match.id,
    challengeId: match.challengeId,
    challengeTitle: match.challenge.title,
    mode: match.challenge.mode as HangmanMode,
    state: match.state as HangmanMatchSnapshot["state"],
    wordMask: finished
      ? match.secretWord
      : buildWordMask(match.secretWord, guessedLetters),
    guessedLetters,
    wrongGuessesX: match.wrongGuessesX,
    wrongGuessesO: match.wrongGuessesO,
    maxWrongGuesses: match.challenge.maxWrongGuesses,
    currentTurn: match.currentTurn as HangmanMark,
    turnNumber: match.turnNumber,
    teamX: teamInfo(match.teamX),
    teamO: teamInfo(match.teamO),
    championX: match.championX
      ? {
          userId: match.championX.id,
          username: match.championX.account.username,
          firstName: match.championX.account.firstName,
          lastName: match.championX.account.lastName,
        }
      : null,
    championO: match.championO
      ? {
          userId: match.championO.id,
          username: match.championO.account.username,
          firstName: match.championO.account.firstName,
          lastName: match.championO.account.lastName,
        }
      : null,
    councilVotes,
    councilVoteCounts: voteCounts(councilVotes),
    winnerTeamId: match.winnerTeamId,
    revealedWord: finished ? match.secretWord : null,
    bracket,
    serverNow: Date.now(),
  };
}

async function emitHangmanState(
  io: SocketIOServer,
  eventSlug: string,
  snapshot: HangmanMatchSnapshot,
) {
  const rooms = [
    hangmanMatchRoom(snapshot.matchId),
    teamRoom(eventSlug, snapshot.teamX.letter),
    teamRoom(eventSlug, snapshot.teamO.letter),
    eventRoom(eventSlug),
  ];
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
    include: { challenge: true, teamX: true, teamO: true },
  });
  if (!match) throw new Error("Match not found.");
  if (match.state !== "WAITING") throw new Error("Match already started.");

  const words = parseHangmanWords(match.challenge.config);
  const secretWord = pickRandomWord(words);

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
      text: `Team ${match.teamX.letter} vs Team ${match.teamO.letter} — Hangman is live.`,
      metadata: { matchId, teamXId: match.teamXId, teamOId: match.teamOId },
    },
    broadcastToAllChats: true,
  });

  return broadcastHangmanState(io, matchId, eventSlug);
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

function currentTurnTeamId(match: { teamXId: string; teamOId: string; currentTurn: string }) {
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
    include: { challenge: true },
  });
  if (!match || match.state !== "ACTIVE") return null;

  const normalized = letter.toUpperCase();
  const guessed = parseGuessedLetters(match.guessedLetters);
  if (guessed.includes(normalized)) return broadcastHangmanState(io, matchId, eventSlug);

  const nextGuessed = [...guessed, normalized];
  const correct = isLetterInWord(normalized, match.secretWord);
  const wordComplete = isWordComplete(match.secretWord, nextGuessed);
  const maxWrong = match.challenge.maxWrongGuesses;

  let wrongGuessesX = match.wrongGuessesX;
  let wrongGuessesO = match.wrongGuessesO;
  let nextTurn: HangmanMark = match.currentTurn as HangmanMark;
  let winnerTeamId: string | null = null;
  let finished = false;

  if (wordComplete) {
    winnerTeamId = currentTurnTeamId(match);
    finished = true;
  } else if (correct) {
    // Same team continues on correct guess.
  } else {
    if (match.currentTurn === "X") wrongGuessesX += 1;
    else wrongGuessesO += 1;

    const turnTeamOut =
      match.currentTurn === "X" ? wrongGuessesX >= maxWrong : wrongGuessesO >= maxWrong;

    if (turnTeamOut) {
      winnerTeamId = match.currentTurn === "X" ? match.teamOId : match.teamXId;
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
      finishedAt: finished ? new Date() : null,
    },
  });

  const snapshot = await broadcastHangmanState(io, matchId, eventSlug);

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
