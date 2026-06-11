import type { Server as SocketIOServer } from "socket.io";
import { prisma, withRetry } from "@/lib/prisma";
import { eventRoom, quizRoom } from "@/server/socket/rooms";
import type { QuizStateSnapshot } from "@/types";

const RESULTS_DURATION_MS = 60_000;

let activeTimers = new Map<string, NodeJS.Timeout>();

export async function buildQuizSnapshot(sessionId: string): Promise<QuizStateSnapshot | null> {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: {
        include: {
          questions: { orderBy: { sortOrder: "asc" } },
        },
      },
      answers: true,
    },
  });

  if (!session) return null;

  const questions = session.quiz.questions;
  const currentQuestion = questions[session.questionIndex];

  const userPoints = new Map<string, number>();
  for (const answer of session.answers) {
    userPoints.set(answer.userId, (userPoints.get(answer.userId) ?? 0) + answer.points);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...userPoints.keys()] } },
    include: { team: true },
  });

  const leaderboard = users
    .map((user) => ({
      userId: user.id,
      username: user.username,
      teamLetter: user.team?.letter ?? null,
      totalPoints: userPoints.get(user.id) ?? 0,
      rank: 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return {
    sessionId: session.id,
    quizId: session.quizId,
    state: session.state,
    questionIndex: session.questionIndex,
    currentQuestion: currentQuestion
      ? {
          id: currentQuestion.id,
          text: currentQuestion.text,
          options: (currentQuestion.options as string[]) ?? [],
          timeLimitSec: currentQuestion.timeLimitSec,
        }
      : null,
    questionStartedAt: session.questionStartedAt?.getTime() ?? null,
    resultsEndsAt: session.resultsEndsAt?.getTime() ?? null,
    serverNow: Date.now(),
    leaderboard,
  };
}

export async function broadcastQuizState(io: SocketIOServer, sessionId: string) {
  const snapshot = await buildQuizSnapshot(sessionId);
  if (!snapshot) return;

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { quiz: { include: { event: true } } },
  });
  if (!session) return;

  const slug = session.quiz.event.slug;
  io.to(quizRoom(slug)).to(eventRoom(slug)).emit("quiz:state", snapshot);
}

function clearSessionTimer(sessionId: string) {
  const timer = activeTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(sessionId);
  }
}

export async function startQuizSession(io: SocketIOServer, quizId: string) {
  await withRetry(() =>
    prisma.quiz.updateMany({ data: { active: false } }),
  );
  await withRetry(() =>
    prisma.quiz.update({ where: { id: quizId }, data: { active: true } }),
  );

  const session = await withRetry(() =>
    prisma.quizSession.create({
      data: { quizId, state: "LOBBY" },
    }),
  );

  await broadcastQuizState(io, session.id);
  return session;
}

export async function startQuestion(io: SocketIOServer, sessionId: string) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { quiz: { include: { questions: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!session) throw new Error("Session not found");

  const question = session.quiz.questions[session.questionIndex];
  if (!question) throw new Error("No more questions");

  clearSessionTimer(sessionId);

  await prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      state: "QUESTION",
      currentQuestionId: question.id,
      questionStartedAt: new Date(),
      resultsEndsAt: null,
    },
  });

  const timer = setTimeout(() => {
    void endQuestion(io, sessionId);
  }, question.timeLimitSec * 1000);
  activeTimers.set(sessionId, timer);

  await broadcastQuizState(io, sessionId);
}

export async function endQuestion(io: SocketIOServer, sessionId: string) {
  clearSessionTimer(sessionId);

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { quiz: { include: { questions: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!session || session.state !== "QUESTION") return;

  const resultsEndsAt = new Date(Date.now() + RESULTS_DURATION_MS);

  await prisma.quizSession.update({
    where: { id: sessionId },
    data: { state: "RESULTS", resultsEndsAt },
  });

  const timer = setTimeout(() => {
    void advanceFromResults(io, sessionId);
  }, RESULTS_DURATION_MS);
  activeTimers.set(sessionId, timer);

  await broadcastQuizState(io, sessionId);
}

async function advanceFromResults(io: SocketIOServer, sessionId: string) {
  clearSessionTimer(sessionId);

  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { quiz: { include: { questions: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!session || session.state !== "RESULTS") return;

  const nextIndex = session.questionIndex + 1;
  if (nextIndex >= session.quiz.questions.length) {
    await prisma.quizSession.update({
      where: { id: sessionId },
      data: { state: "FINISHED", endedAt: new Date() },
    });
  } else {
    await prisma.quizSession.update({
      where: { id: sessionId },
      data: { questionIndex: nextIndex, state: "LOBBY" },
    });
  }

  await broadcastQuizState(io, sessionId);
}

export async function submitQuizAnswer(
  io: SocketIOServer,
  sessionId: string,
  userId: string,
  teamId: string | null,
  questionId: string,
  answerIndex: number,
) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { quiz: { include: { questions: true } } },
  });
  if (!session || session.state !== "QUESTION" || session.currentQuestionId !== questionId) {
    throw new Error("Cannot submit answer now");
  }

  const question = session.quiz.questions.find((q) => q.id === questionId);
  if (!question) throw new Error("Question not found");

  const existing = await prisma.quizAnswer.findUnique({
    where: { sessionId_questionId_userId: { sessionId, questionId, userId } },
  });
  if (existing) return existing;

  const isCorrect = question.correctIndex === answerIndex;
  const elapsed = session.questionStartedAt
    ? Date.now() - session.questionStartedAt.getTime()
    : question.timeLimitSec * 1000;
  const timeBonus = Math.max(0, Math.floor((question.timeLimitSec * 1000 - elapsed) / 100));
  const points = isCorrect ? 1000 + timeBonus : 0;

  const answer = await prisma.quizAnswer.create({
    data: {
      sessionId,
      questionId,
      userId,
      teamId,
      answerIndex,
      points,
    },
  });

  await broadcastQuizState(io, sessionId);
  return answer;
}

export async function adminStartNextQuestion(io: SocketIOServer, sessionId: string) {
  const session = await prisma.quizSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Session not found");

  if (session.state === "LOBBY" || session.state === "FINISHED") {
    if (session.state === "FINISHED") return session;
    await startQuestion(io, sessionId);
  } else if (session.state === "RESULTS") {
    clearSessionTimer(sessionId);
    await advanceFromResults(io, sessionId);
    const updated = await prisma.quizSession.findUnique({ where: { id: sessionId } });
    if (updated?.state === "LOBBY") {
      await startQuestion(io, sessionId);
    }
  }

  return prisma.quizSession.findUnique({ where: { id: sessionId } });
}

export async function endQuizGame(io: SocketIOServer, sessionId: string) {
  clearSessionTimer(sessionId);
  await prisma.quizSession.update({
    where: { id: sessionId },
    data: { state: "FINISHED", endedAt: new Date() },
  });
  await prisma.quiz.updateMany({ data: { active: false } });
  await broadcastQuizState(io, sessionId);
}
