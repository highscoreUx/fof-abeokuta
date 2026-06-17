import type { Server as SocketIOServer, Socket } from "socket.io";
import { resolveSocketEventAuth, type SocketEventAuth } from "@/lib/auth/resolve-socket-event-auth";
import { prisma } from "@/lib/prisma";
import {
  eventRoom,
  quizRoom,
  roleRoom,
  spinnerSessionRoom,
  countdownSessionRoom,
  hangmanMatchRoom,
  socialGameMatchRoom,
  staffRoom,
  teamRoom,
  ticTacToeMatchRoom,
  userRoom,
} from "@/server/socket/rooms";
import {
  adminStartNextQuestion,
  broadcastQuizState,
  endQuizGame,
  startQuizSession,
  submitQuizAnswer,
} from "@/server/games/quizEngine";
import {
  broadcastSpinnerState,
  endSpinnerSession,
  performSpinnerSpin,
  startSpinnerSession,
} from "@/server/games/spinnerEngine";
import {
  broadcastCountdownState,
  adjustCountdownSession,
  pauseCountdownSession,
  resetCountdownSession,
  resumeCountdownSession,
  startCountdownSession,
} from "@/server/games/countdownEngine";
import {
  buildHangmanSnapshot,
  handleHangmanGuess,
  setHangmanChampion,
  startHangmanMatch,
} from "@/server/games/hangmanEngine";
import {
  buildTttSnapshot,
  handleTttMove,
  setTttChampion,
  startTttMatch,
} from "@/server/games/ticTacToeEngine";
import {
  applySocialGameMove,
  buildSocialGameSnapshot,
} from "@/server/games/socialGameEngine";
import {
  castChatPollVote,
  createDirectChatMessage,
  createGlobalChatMessage,
  createStaffChatMessage,
  createTeamChatMessage,
} from "@/lib/chat-messages-server";
import { isTeamChatEnabled } from "@/lib/chat-settings";
import { isDmRoomId } from "@/lib/chat-dm";
import { CHAT_TYPING_EVENT } from "@/lib/chat-typing";
import { isStaffRoomId } from "@/lib/chat-staff";
import { isActivityEnabledForEvent } from "@/lib/activities/event-activities";
import {
  ACTIVITY_KAHOOT,
  ACTIVITY_SPINNER,
  ACTIVITY_TIC_TAC_TOE,
  ACTIVITY_COUNTDOWN,
  ACTIVITY_HANGMAN,
  userCanAccessActivityInstance,
} from "@/lib/activities/catalog";
import { hasPermission } from "@/lib/permissions";
import { resolveTypingBroadcastRoom } from "@/server/socket/chat-typing";
import { buildCompetitionLeaderboard } from "@/lib/leaderboard";
import {
  getOnlineUserIds,
  presenceConnect,
  presenceDisconnect,
} from "@/server/presence";
import { primarySocketRoleSlug } from "@/lib/account-permissions";
import type { AccessTokenPayload } from "@/types";
import type { Permission } from "@/lib/permissions/catalog";

function socketCan(auth: AccessTokenPayload, permission: Permission): boolean {
  return hasPermission(auth.permissions, permission);
}

interface AuthenticatedSocket extends Socket {
  auth?: SocketEventAuth;
}

export function registerSocketHandlers(io: SocketIOServer) {
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      const eventSlug = socket.handshake.auth?.eventSlug as string | undefined;
      if (!token) return next(new Error("Unauthorized"));

      socket.auth = await resolveSocketEventAuth(token, eventSlug ?? "");
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const auth = socket.auth!;
    const slug = auth.eventSlug;

    socket.join(eventRoom(slug));
    socket.join(roleRoom(slug, primarySocketRoleSlug(auth.permissions)));
    socket.join(userRoom(auth.userId));
    if (auth.teamLetter) socket.join(teamRoom(slug, auth.teamLetter));
    if (socketCan(auth, "participant.staff_chat")) socket.join(staffRoom(slug));
    socket.join(quizRoom(slug));

    presenceConnect(io, auth.eventId, slug, auth.userId, socket.id);
    socket.emit("presence:state", { onlineUserIds: getOnlineUserIds(auth.eventId) });

    socket.on(
      "global:message",
      async (payload: unknown, ack?: (response: { message?: unknown; error?: string }) => void) => {
        try {
          const message = await createGlobalChatMessage(
            auth.eventId,
            slug,
            auth.userId,
            payload,
          );
          ack?.({ message });
        } catch (error) {
          ack?.({
            error: error instanceof Error ? error.message : "Failed to send message",
          });
        }
      },
    );

    socket.on(
      "team:message",
      async (payload: unknown, ack?: (response: { message?: unknown; error?: string }) => void) => {
        if (!auth.teamId) {
          ack?.({ error: "No team assigned" });
          return;
        }

        if (!(await isTeamChatEnabled(auth.eventId))) {
          ack?.({ error: "Team chat is disabled" });
          return;
        }

        try {
          const message = await createTeamChatMessage(
            auth.eventId,
            slug,
            auth.userId,
            auth.teamId,
            payload,
          );
          ack?.({ message });
        } catch (error) {
          ack?.({
            error: error instanceof Error ? error.message : "Failed to send message",
          });
        }
      },
    );

    socket.on(
      "staff:message",
      async (payload: unknown, ack?: (response: { message?: unknown; error?: string }) => void) => {
        if (!socketCan(auth, "participant.staff_chat")) {
          ack?.({ error: "Forbidden" });
          return;
        }

        try {
          const message = await createStaffChatMessage(
            auth.eventId,
            slug,
            auth.userId,
            payload,
          );
          ack?.({ message });
        } catch (error) {
          ack?.({
            error: error instanceof Error ? error.message : "Failed to send message",
          });
        }
      },
    );

    socket.on(
      "dm:message",
      async (
        data: { recipientId: string; payload: unknown },
        ack?: (response: { message?: unknown; error?: string }) => void,
      ) => {
        if (
          !data ||
          typeof data.recipientId !== "string" ||
          data.payload === undefined
        ) {
          ack?.({ error: "Invalid message" });
          return;
        }

        try {
          const message = await createDirectChatMessage(
            auth.eventId,
            auth.userId,
            data.recipientId,
            data.payload,
          );
          ack?.({ message });
        } catch (error) {
          ack?.({
            error: error instanceof Error ? error.message : "Failed to send message",
          });
        }
      },
    );

    socket.on(
      "poll:vote",
      async (
        data: { messageId: string; optionIndex: number },
        ack?: (response: { message?: unknown; error?: string }) => void,
      ) => {
        if (!socketCan(auth, "participant.chat")) {
          ack?.({ error: "Forbidden" });
          return;
        }

        if (
          !data ||
          typeof data.messageId !== "string" ||
          typeof data.optionIndex !== "number" ||
          !Number.isInteger(data.optionIndex)
        ) {
          ack?.({ error: "Invalid vote" });
          return;
        }

        try {
          const message = await castChatPollVote(
            auth.eventId,
            slug,
            data.messageId,
            auth.userId,
            data.optionIndex,
          );
          ack?.({ message });
        } catch (error) {
          ack?.({
            error: error instanceof Error ? error.message : "Failed to vote",
          });
        }
      },
    );

    socket.on(CHAT_TYPING_EVENT, (data: { roomId?: string; isTyping?: boolean }) => {
      if (!socketCan(auth, "participant.chat")) return;
      if (!data || typeof data.roomId !== "string" || typeof data.isTyping !== "boolean") {
        return;
      }

      if (isStaffRoomId(data.roomId) && !socketCan(auth, "participant.staff_chat")) {
        return;
      }

      if (isDmRoomId(data.roomId) && data.isTyping) {
        const peerId = data.roomId.slice(3);
        if (!peerId || peerId === auth.userId) return;
      }

      const targetRoom = resolveTypingBroadcastRoom(slug, data.roomId, auth);
      if (!targetRoom) return;

      socket.to(targetRoom).emit(CHAT_TYPING_EVENT, {
        roomId: data.roomId,
        userId: auth.userId,
        firstName: auth.firstName ?? "",
        lastName: auth.lastName ?? "",
        isTyping: data.isTyping,
      });
    });

    socket.on(
      "quiz:answer",
      async (data: {
        sessionId: string;
        questionId: string;
        answerIndex?: number;
        answerValue?: Record<string, unknown>;
      }) => {
      try {
        const session = await prisma.quizSession.findUnique({
          where: { id: data.sessionId },
          include: { quiz: true },
        });
        if (!session || session.quiz.eventId !== auth.eventId) return;

        const kahootEnabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_KAHOOT);
        if (!kahootEnabled) return;

        if (
          !userCanAccessActivityInstance(auth, {
            allowGeneralParticipants: session.quiz.allowGeneralParticipants,
            allowGroupParticipants: session.quiz.allowGroupParticipants,
          }) &&
          !socketCan(auth, "quiz.run")
        ) {
          return;
        }

        const payload = data.answerValue ?? { answerIndex: data.answerIndex ?? -1 };
        const { result } = await submitQuizAnswer(
          io,
          data.sessionId,
          auth.userId,
          auth.teamId ?? null,
          data.questionId,
          payload,
        );
        socket.emit("quiz:answer:result", result);
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Failed to submit answer",
        });
      }
    },
    );

    socket.on("quiz:admin:start", async (quizId: string) => {
      if (!socketCan(auth, "quiz.run")) return;
      const kahootEnabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_KAHOOT);
      if (!kahootEnabled) return;
      const session = await startQuizSession(io, quizId, auth.userId);
      socket.emit("sync:toast", { type: "success", message: "Activity session started" });
      await broadcastQuizState(io, session.id);
    });

    socket.on("quiz:admin:next", async (sessionId: string) => {
      if (!socketCan(auth, "quiz.run")) return;
      const kahootEnabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_KAHOOT);
      if (!kahootEnabled) return;
      await adminStartNextQuestion(io, sessionId);
    });

    socket.on("quiz:admin:end", async (sessionId: string) => {
      if (!socketCan(auth, "quiz.run")) return;
      const kahootEnabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_KAHOOT);
      if (!kahootEnabled) return;
      await endQuizGame(io, sessionId);
    });

    socket.on("spinner:join", async (sessionId: string) => {
      if (typeof sessionId !== "string" || !sessionId) return;
      socket.join(spinnerSessionRoom(sessionId));
      const snapshot = await broadcastSpinnerState(io, sessionId, slug);
      if (snapshot) {
        socket.emit("spinner:state", snapshot);
      }
    });

    socket.on("spinner:session:start", async (challengeId: string) => {
      try {
        const spinnerEnabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_SPINNER);
        if (!spinnerEnabled) return;

        const challenge = await prisma.spinChallenge.findFirst({
          where: { id: challengeId, eventId: auth.eventId },
        });
        if (!challenge) return;

        const canRun = socketCan(auth, "spin.run");
        if (
          !canRun &&
          !userCanAccessActivityInstance(auth, {
            allowGeneralParticipants: challenge.allowGeneralParticipants,
            allowGroupParticipants: challenge.allowGroupParticipants,
          })
        ) {
          return;
        }

        const snapshot = await startSpinnerSession(io, {
          challengeId,
          eventId: auth.eventId,
          eventSlug: slug,
          userId: auth.userId,
          teamId: auth.teamId ?? null,
        });
        if (snapshot) socket.join(spinnerSessionRoom(snapshot.sessionId));
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Failed to start spinner",
        });
      }
    });

    socket.on("spinner:spin", async (sessionId: string) => {
      try {
        const spinnerEnabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_SPINNER);
        if (!spinnerEnabled) return;

        const snapshot = await performSpinnerSpin(io, {
          sessionId,
          eventId: auth.eventId,
          eventSlug: slug,
          userId: auth.userId,
          teamId: auth.teamId ?? null,
        });
        if (snapshot) socket.join(spinnerSessionRoom(snapshot.sessionId));
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Failed to spin",
        });
      }
    });

    socket.on("countdown:join", async (sessionId: string) => {
      if (typeof sessionId !== "string" || !sessionId) return;
      socket.join(countdownSessionRoom(sessionId));
      const snapshot = await broadcastCountdownState(io, sessionId, slug);
      if (snapshot) socket.emit("countdown:state", snapshot);
    });

    socket.on("countdown:admin:start", async (challengeId: string) => {
      try {
        if (!socketCan(auth, "countdown.run")) return;
        const enabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_COUNTDOWN);
        if (!enabled) return;

        const snapshot = await startCountdownSession(io, {
          challengeId,
          eventId: auth.eventId,
          eventSlug: slug,
          userId: auth.userId,
        });
        if (snapshot) socket.join(countdownSessionRoom(snapshot.sessionId));
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Failed to start countdown",
        });
      }
    });

    socket.on("countdown:admin:pause", async (sessionId: string) => {
      try {
        if (!socketCan(auth, "countdown.run")) return;
        const enabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_COUNTDOWN);
        if (!enabled) return;

        const snapshot = await pauseCountdownSession(io, {
          sessionId,
          eventId: auth.eventId,
          eventSlug: slug,
        });
        if (snapshot) socket.join(countdownSessionRoom(snapshot.sessionId));
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Failed to pause countdown",
        });
      }
    });

    socket.on("countdown:admin:resume", async (sessionId: string) => {
      try {
        if (!socketCan(auth, "countdown.run")) return;
        const enabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_COUNTDOWN);
        if (!enabled) return;

        const snapshot = await resumeCountdownSession(io, {
          sessionId,
          eventId: auth.eventId,
          eventSlug: slug,
        });
        if (snapshot) socket.join(countdownSessionRoom(snapshot.sessionId));
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Failed to resume countdown",
        });
      }
    });

    socket.on("countdown:admin:reset", async (sessionId: string) => {
      try {
        if (!socketCan(auth, "countdown.run")) return;
        const enabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_COUNTDOWN);
        if (!enabled) return;

        await resetCountdownSession(io, {
          sessionId,
          eventId: auth.eventId,
          eventSlug: slug,
        });
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Failed to reset countdown",
        });
      }
    });

    socket.on(
      "countdown:admin:adjust",
      async (data: { sessionId: string; deltaSec: number }) => {
        try {
          if (!socketCan(auth, "countdown.run")) return;
          const enabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_COUNTDOWN);
          if (!enabled) return;
          if (!data?.sessionId || typeof data.deltaSec !== "number") return;

          const snapshot = await adjustCountdownSession(io, {
            sessionId: data.sessionId,
            eventId: auth.eventId,
            eventSlug: slug,
            deltaSec: data.deltaSec,
          });
          if (snapshot) socket.join(countdownSessionRoom(snapshot.sessionId));
        } catch (error) {
          socket.emit("sync:toast", {
            type: "error",
            message: error instanceof Error ? error.message : "Failed to adjust countdown",
          });
        }
      },
    );

    socket.on("ttt:match:join", async (matchId: string) => {
      if (typeof matchId !== "string" || !matchId) return;
      socket.join(ticTacToeMatchRoom(matchId));
      const snapshot = await buildTttSnapshot(matchId);
      if (snapshot) socket.emit("ttt:state", snapshot);
    });

    socket.on("ttt:match:start", async (matchId: string) => {
      try {
        const enabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_TIC_TAC_TOE);
        if (!enabled) return;

        const match = await prisma.ticTacToeMatch.findFirst({
          where: { id: matchId, eventId: auth.eventId },
          include: { challenge: true },
        });
        if (!match) return;

        const canRun =
          socketCan(auth, "tic_tac_toe.run") || socketCan(auth, "tic_tac_toe.manage");
        if (
          !canRun &&
          !userCanAccessActivityInstance(auth, {
            allowGeneralParticipants: match.challenge.allowGeneralParticipants,
            allowGroupParticipants: match.challenge.allowGroupParticipants,
          })
        ) {
          return;
        }

        const snapshot = await startTttMatch(io, matchId, auth.eventId, slug, auth.userId);
        if (snapshot) socket.join(ticTacToeMatchRoom(matchId));
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Failed to start match",
        });
      }
    });

    socket.on(
      "ttt:champion:set",
      async (data: { matchId: string; teamId: string; championUserId: string }) => {
        try {
          const enabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_TIC_TAC_TOE);
          if (!enabled) return;
          if (!data?.matchId || !data.teamId || !data.championUserId) return;

          await setTttChampion(io, {
            matchId: data.matchId,
            eventId: auth.eventId,
            eventSlug: slug,
            userId: auth.userId,
            teamId: data.teamId,
            championUserId: data.championUserId,
          });
        } catch (error) {
          socket.emit("sync:toast", {
            type: "error",
            message: error instanceof Error ? error.message : "Failed to set champion",
          });
        }
      },
    );

    socket.on("ttt:move", async (data: { matchId: string; cellIndex: number }) => {
      try {
        const enabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_TIC_TAC_TOE);
        if (!enabled) return;
        if (!data?.matchId || typeof data.cellIndex !== "number") return;

        await handleTttMove(io, {
          matchId: data.matchId,
          eventId: auth.eventId,
          eventSlug: slug,
          userId: auth.userId,
          teamId: auth.teamId ?? null,
          cellIndex: data.cellIndex,
        });
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Invalid move",
        });
      }
    });

    socket.on("hangman:match:join", async (matchId: string) => {
      if (typeof matchId !== "string" || !matchId) return;
      socket.join(hangmanMatchRoom(matchId));
      const snapshot = await buildHangmanSnapshot(matchId);
      if (snapshot) socket.emit("hangman:state", snapshot);
    });

    socket.on("hangman:match:start", async (matchId: string) => {
      try {
        const enabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_HANGMAN);
        if (!enabled) return;

        const match = await prisma.hangmanMatch.findFirst({
          where: { id: matchId, eventId: auth.eventId },
          include: { challenge: true },
        });
        if (!match) return;

        const canRun =
          socketCan(auth, "hangman.run") || socketCan(auth, "hangman.manage");
        if (
          !canRun &&
          !userCanAccessActivityInstance(auth, {
            allowGeneralParticipants: match.challenge.allowGeneralParticipants,
            allowGroupParticipants: match.challenge.allowGroupParticipants,
          })
        ) {
          return;
        }

        const snapshot = await startHangmanMatch(io, matchId, auth.eventId, slug, auth.userId);
        if (snapshot) socket.join(hangmanMatchRoom(matchId));
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Failed to start match",
        });
      }
    });

    socket.on(
      "hangman:champion:set",
      async (data: { matchId: string; teamId: string; championUserId: string }) => {
        try {
          const enabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_HANGMAN);
          if (!enabled) return;
          if (!data?.matchId || !data.teamId || !data.championUserId) return;

          await setHangmanChampion(io, {
            matchId: data.matchId,
            eventId: auth.eventId,
            eventSlug: slug,
            teamId: data.teamId,
            championUserId: data.championUserId,
          });
        } catch (error) {
          socket.emit("sync:toast", {
            type: "error",
            message: error instanceof Error ? error.message : "Failed to set champion",
          });
        }
      },
    );

    socket.on("hangman:guess", async (data: { matchId: string; letter: string }) => {
      try {
        const enabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_HANGMAN);
        if (!enabled) return;
        if (!data?.matchId || !data.letter) return;

        await handleHangmanGuess(io, {
          matchId: data.matchId,
          eventId: auth.eventId,
          eventSlug: slug,
          userId: auth.userId,
          teamId: auth.teamId ?? null,
          letter: data.letter,
        });
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Invalid guess",
        });
      }
    });

    socket.on("social-game:join", async (matchId: string) => {
      if (typeof matchId !== "string" || !matchId) return;
      socket.join(socialGameMatchRoom(matchId));
      const snapshot = await buildSocialGameSnapshot(matchId, auth.userId);
      if (snapshot) socket.emit("social-game:state", snapshot);
    });

    socket.on(
      "social-game:move",
      async (data: { matchId: string; action: string; payload?: Record<string, unknown> }) => {
        try {
          if (!data?.matchId || !data.action) return;
          await applySocialGameMove({
            matchId: data.matchId,
            eventSlug: slug,
            userId: auth.userId,
            action: data.action,
            payload: data.payload ?? {},
          });
        } catch (error) {
          socket.emit("sync:toast", {
            type: "error",
            message: error instanceof Error ? error.message : "Invalid move",
          });
        }
      },
    );

    socket.on("spinner:session:end", async (sessionId: string) => {
      try {
        const spinnerEnabled = await isActivityEnabledForEvent(auth.eventId, ACTIVITY_SPINNER);
        if (!spinnerEnabled) return;

        const session = await prisma.spinnerSession.findFirst({
          where: { id: sessionId, eventId: auth.eventId },
          include: { challenge: true },
        });
        if (!session) return;

        const canEnd =
          socketCan(auth, "spin.run") || session.startedByUserId === auth.userId;
        if (!canEnd) return;

        await endSpinnerSession(io, {
          sessionId,
          eventId: auth.eventId,
          eventSlug: slug,
          userId: auth.userId,
        });
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Failed to end spinner",
        });
      }
    });

    socket.on("stream:admin:toggle", async (data: { live: boolean; videoId?: string }) => {
      if (!socketCan(auth, "settings.broadcasting")) return;
      if (data.videoId) {
        await prisma.appSetting.upsert({
          where: { eventId_key: { eventId: auth.eventId, key: "youtube_video_id" } },
          create: { eventId: auth.eventId, key: "youtube_video_id", value: data.videoId },
          update: { value: data.videoId },
        });
      }
      await prisma.appSetting.upsert({
        where: { eventId_key: { eventId: auth.eventId, key: "stream_live" } },
        create: { eventId: auth.eventId, key: "stream_live", value: String(data.live) },
        update: { value: String(data.live) },
      });

      const videoSetting = await prisma.appSetting.findUnique({
        where: { eventId_key: { eventId: auth.eventId, key: "youtube_video_id" } },
      });

      io.to(eventRoom(slug)).emit("stream:live", {
        live: data.live,
        videoId: data.videoId ?? videoSetting?.value,
      });
    });

    socket.on("vote:admin:open", async (voteId: string) => {
      if (!socketCan(auth, "vote.manage")) return;
      const vote = await prisma.vote.updateMany({
        where: { id: voteId, eventId: auth.eventId },
        data: { open: true },
      });
      if (vote.count === 0) return;
      const updated = await prisma.vote.findUnique({ where: { id: voteId } });
      io.to(eventRoom(slug)).emit("vote:state", updated);
    });

    socket.on("disconnect", () => {
      presenceDisconnect(io, auth.eventId, slug, auth.userId, socket.id);
    });
  });
}

export async function emitCheckInUpdate(
  io: SocketIOServer,
  eventSlug: string,
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    team?: { letter: string } | null;
    checkedInAt: Date | null;
  },
) {
  io.to(roleRoom(eventSlug, "staff"))
    .to(roleRoom(eventSlug, "event_admin"))
    .to(roleRoom(eventSlug, "coordinator"))
    .emit("checkin:updated", {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    teamLetter: user.team?.letter ?? null,
    checkedInAt: user.checkedInAt?.toISOString() ?? null,
  });
}

export async function broadcastLeaderboard(io: SocketIOServer, eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;

  const { cacheDelete } = await import("@/lib/cache/index");
  await cacheDelete(`leaderboard:${eventId}:competition`);

  const leaderboard = await buildCompetitionLeaderboard(eventId);
  io.to(eventRoom(event.slug)).emit("leaderboard:update", leaderboard);
}
