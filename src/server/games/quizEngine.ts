import type { Server as SocketIOServer } from "socket.io";
import { prisma, withRetry } from "@/lib/prisma";
import { eventRoom, quizRoom } from "@/server/socket/rooms";
import {
  calculateQuestionScore,
  computeAccuracy,
  computeStreakBeforeAnswer,
  KAHOOT_RESULTS_DURATION_MS,
} from "@/server/games/kahootScoring";
import { scoreTriviaAnswer, toTriviaQuestionRecord } from "@/lib/trivia/scoring";
import type {
  QuizAnswerResult,
  QuizQuestionResults,
  QuizStateSnapshot,
  TriviaAnswerPayload,
  TriviaQuestionConfig,
  TriviaQuestionType,
} from "@/types";

const activeTimers = new Map<string, NodeJS.Timeout>();

function clearSessionTimer(sessionId: string) {
  const timer = activeTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(sessionId);
  }
}

function buildLeaderboard(
  answers: Array<{ userId: string; points: number; isCorrect: boolean; streakAtAnswer: number }>,
  users: Array<{ id: string; username: string; team: { letter: string } | null }>,
): QuizStateSnapshot["leaderboard"] {
  const stats = new Map<
    string,
    { totalPoints: number; correct: number; answered: number; streak: number }
  >();

  for (const answer of answers) {
    const current = stats.get(answer.userId) ?? {
      totalPoints: 0,
      correct: 0,
      answered: 0,
      streak: 0,
    };
    current.totalPoints += answer.points;
    current.answered += 1;
    if (answer.isCorrect) current.correct += 1;
    current.streak = answer.streakAtAnswer;
    stats.set(answer.userId, current);
  }

  return users
    .map((user) => {
      const s = stats.get(user.id) ?? {
        totalPoints: 0,
        correct: 0,
        answered: 0,
        streak: 0,
      };
      return {
        userId: user.id,
        username: user.username,
        teamLetter: user.team?.letter ?? null,
        totalPoints: s.totalPoints,
        rank: 0,
        streak: s.streak,
        questionsAnswered: s.answered,
        correctCount: s.correct,
        accuracy: computeAccuracy(s.correct, s.answered),
      };
    })
    .filter((e) => e.questionsAnswered > 0 || e.totalPoints > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints || b.accuracy - a.accuracy)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

async function buildQuestionResults(
  sessionId: string,
  question: {
    id: string;
    type: string;
    correctIndex: number;
    options: unknown;
    config: unknown;
  },
): Promise<QuizQuestionResults> {
  const record = toTriviaQuestionRecord({
    ...question,
    text: "",
    timeLimitSec: 20,
  });
  const options = record.options;
  const optionCounts = new Array(Math.max(options.length, 1)).fill(0);

  const answers = await prisma.quizAnswer.findMany({
    where: { sessionId, questionId: question.id },
    include: { user: { include: { team: true } } },
    orderBy: [{ points: "desc" }, { responseTimeMs: "asc" }],
  });

  for (const answer of answers) {
    if (answer.answerIndex >= 0 && answer.answerIndex < optionCounts.length) {
      optionCounts[answer.answerIndex] += 1;
    }
  }

  const config = record.config;
  return {
    correctIndex:
      record.type === "QUIZ" ||
      record.type === "QUIZ_IMAGE" ||
      record.type === "TRUE_FALSE" ||
      record.type === "QUIZ_AUDIO"
        ? question.correctIndex
        : null,
    correctValue: record.type === "SLIDER" ? (config.correct ?? question.correctIndex) : null,
    correctOrder:
      record.type === "PUZZLE" || record.type === "PUZZLE_IMAGE"
        ? (config.correctOrder ?? null)
        : null,
    optionCounts,
    topScorers: answers.slice(0, 5).map((a) => ({
      userId: a.userId,
      username: a.user.username,
      teamLetter: a.user.team?.letter ?? null,
      points: a.points,
      responseTimeMs: a.responseTimeMs,
      isCorrect: a.isCorrect,
    })),
  };
}

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
  const questionIds = questions.map((q) => q.id);

  const userIds = [...new Set(session.answers.map((a) => a.userId))];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          include: { team: true },
        })
      : [];

  const leaderboard = buildLeaderboard(session.answers, users);

  const currentQuestionAnswers = currentQuestion
    ? session.answers.filter((a) => a.questionId === currentQuestion.id)
    : [];

  let correctIndex: number | null = null;
  let questionResults: QuizQuestionResults | null = null;

  if (currentQuestion && (session.state === "RESULTS" || session.state === "FINISHED")) {
    correctIndex = currentQuestion.correctIndex;
    questionResults = await buildQuestionResults(sessionId, currentQuestion);
  }

  return {
    sessionId: session.id,
    quizId: session.quizId,
    quizTitle: session.quiz.title,
    state: session.state,
    questionIndex: session.questionIndex,
    totalQuestions: questions.length,
    currentQuestion: currentQuestion
      ? {
          id: currentQuestion.id,
          type: currentQuestion.type as TriviaQuestionType,
          text: currentQuestion.text,
          options: (currentQuestion.options as string[]) ?? [],
          config: (currentQuestion.config as TriviaQuestionConfig) ?? {},
          mediaUrl: currentQuestion.mediaUrl,
          timeLimitSec: currentQuestion.timeLimitSec,
        }
      : null,
    correctIndex,
    questionResults,
    questionStartedAt: session.questionStartedAt?.getTime() ?? null,
    resultsEndsAt: session.resultsEndsAt?.getTime() ?? null,
    serverNow: Date.now(),
    answeredCount: session.state === "QUESTION" ? currentQuestionAnswers.length : undefined,
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

export async function startQuizSession(io: SocketIOServer, quizId: string) {
  await withRetry(() => prisma.quiz.updateMany({ data: { active: false } }));
  await withRetry(() => prisma.quiz.update({ where: { id: quizId }, data: { active: true } }));

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

  const resultsEndsAt = new Date(Date.now() + KAHOOT_RESULTS_DURATION_MS);

  await prisma.quizSession.update({
    where: { id: sessionId },
    data: { state: "RESULTS", resultsEndsAt },
  });

  const timer = setTimeout(() => {
    void advanceFromResults(io, sessionId);
  }, KAHOOT_RESULTS_DURATION_MS);
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
  payload: TriviaAnswerPayload,
): Promise<{ answer: Awaited<ReturnType<typeof prisma.quizAnswer.create>>; result: QuizAnswerResult }> {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: { include: { questions: { orderBy: { sortOrder: "asc" } } } },
      answers: { where: { userId } },
    },
  });
  if (!session || session.state !== "QUESTION" || session.currentQuestionId !== questionId) {
    throw new Error("Cannot submit answer now");
  }

  const question = session.quiz.questions.find((q) => q.id === questionId);
  if (!question) throw new Error("Question not found");

  const existing = await prisma.quizAnswer.findUnique({
    where: { sessionId_questionId_userId: { sessionId, questionId, userId } },
  });
  if (existing) {
    const totalPoints = session.answers.reduce((sum, a) => sum + a.points, 0);
    return {
      answer: existing,
      result: {
        sessionId,
        questionId,
        answerIndex: existing.answerIndex >= 0 ? existing.answerIndex : undefined,
        answerValue: (existing.answerValue as TriviaAnswerPayload | null) ?? undefined,
        isCorrect: existing.isCorrect,
        points: existing.points,
        speedPoints: existing.points,
        streakMultiplier: 1,
        streak: existing.streakAtAnswer,
        responseTimeMs: existing.responseTimeMs,
        totalPoints,
        accuracy: computeAccuracy(
          session.answers.filter((a) => a.isCorrect).length,
          session.answers.length,
        ),
      },
    };
  }

  const record = toTriviaQuestionRecord(question);
  const isCorrect = scoreTriviaAnswer(record, payload);
  const answerIndex = payload.answerIndex ?? -1;
  const timeLimitMs = question.timeLimitSec * 1000;
  const responseTimeMs = session.questionStartedAt
    ? Math.max(0, Date.now() - session.questionStartedAt.getTime())
    : timeLimitMs;

  const questionIds = session.quiz.questions.map((q) => q.id);
  const streakBefore = computeStreakBeforeAnswer(
    session.answers.map((a) => ({ isCorrect: a.isCorrect, questionId: a.questionId })),
    questionIds,
    questionId,
  );

  const { points, streakAfter, multiplier, speedPoints } = calculateQuestionScore(
    isCorrect,
    responseTimeMs,
    timeLimitMs,
    streakBefore,
  );

  const answer = await prisma.quizAnswer.create({
    data: {
      sessionId,
      questionId,
      userId,
      teamId,
      answerIndex,
      answerValue: payload as object,
      points,
      responseTimeMs,
      isCorrect,
      streakAtAnswer: streakAfter,
    },
  });

  const allAnswers = await prisma.quizAnswer.findMany({ where: { sessionId, userId } });
  const totalPoints = allAnswers.reduce((sum, a) => sum + a.points, 0);
  const correctCount = allAnswers.filter((a) => a.isCorrect).length;

  const result: QuizAnswerResult = {
    sessionId,
    questionId,
    answerIndex: answerIndex >= 0 ? answerIndex : undefined,
    answerValue: payload,
    isCorrect,
    points,
    speedPoints,
    streakMultiplier: multiplier,
    streak: streakAfter,
    responseTimeMs,
    totalPoints,
    accuracy: computeAccuracy(correctCount, allAnswers.length),
  };

  await broadcastQuizState(io, sessionId);
  return { answer, result };
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
