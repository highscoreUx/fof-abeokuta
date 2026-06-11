import type { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import {
  eventRoom,
  quizRoom,
  roleRoom,
  staffRoom,
  teamRoom,
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
  broadcastSpinState,
  completeSpinChallenge,
  startSpinChallenge,
  submitSpinBuild,
} from "@/server/games/spinToBuild";
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
import { hasPermission } from "@/lib/permissions";
import { resolveTypingBroadcastRoom } from "@/server/socket/chat-typing";
import type { AccessTokenPayload } from "@/types";
import type { Permission } from "@/lib/permissions/catalog";

function socketCan(auth: AccessTokenPayload, permission: Permission): boolean {
  return hasPermission(auth.permissions, permission);
}

interface AuthenticatedSocket extends Socket {
  auth?: AccessTokenPayload & {
    username?: string;
    firstName?: string;
    lastName?: string;
    teamLetter?: string | null;
  };
}

export function registerSocketHandlers(io: SocketIOServer) {
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Unauthorized"));

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: { team: true },
      });
      if (!user || user.eventId !== payload.eventId) return next(new Error("User not found"));

      socket.auth = {
        ...payload,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        teamLetter: user.team?.letter ?? null,
      };
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    const auth = socket.auth!;
    const slug = auth.eventSlug;

    socket.join(eventRoom(slug));
    socket.join(roleRoom(slug, auth.eventUserRoleSlug));
    socket.join(userRoom(auth.userId));
    if (auth.teamLetter) socket.join(teamRoom(slug, auth.teamLetter));
    if (socketCan(auth, "participant.staff_chat")) socket.join(staffRoom(slug));
    socket.join(quizRoom(slug));

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

    socket.on("quiz:answer", async (data: { sessionId: string; questionId: string; answerIndex: number }) => {
      try {
        await submitQuizAnswer(
          io,
          data.sessionId,
          auth.userId,
          auth.teamId ?? null,
          data.questionId,
          data.answerIndex,
        );
      } catch (error) {
        socket.emit("sync:toast", {
          type: "error",
          message: error instanceof Error ? error.message : "Failed to submit answer",
        });
      }
    });

    socket.on("quiz:admin:start", async (quizId: string) => {
      if (!socketCan(auth, "quiz.run")) return;
      const session = await startQuizSession(io, quizId);
      socket.emit("sync:toast", { type: "success", message: "Quiz session started" });
      await broadcastQuizState(io, session.id);
    });

    socket.on("quiz:admin:next", async (sessionId: string) => {
      if (!socketCan(auth, "quiz.run")) return;
      await adminStartNextQuestion(io, sessionId);
    });

    socket.on("quiz:admin:end", async (sessionId: string) => {
      if (!socketCan(auth, "quiz.run")) return;
      await endQuizGame(io, sessionId);
    });

    socket.on("spin:admin:start", async (title?: string) => {
      if (!socketCan(auth, "spin.run")) return;
      await startSpinChallenge(io, auth.eventId, title);
    });

    socket.on("spin:submit", async (data: { challengeId: string; payload: Record<string, unknown> }) => {
      if (!auth.teamId) return;
      await submitSpinBuild(data.challengeId, auth.teamId, auth.userId, data.payload);
      await broadcastSpinState(io, slug);
    });

    socket.on("spin:admin:complete", async (challengeId: string) => {
      if (!socketCan(auth, "spin.run")) return;
      await completeSpinChallenge(io, challengeId, slug);
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
      // no-op
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

  const teams = await prisma.team.findMany({ where: { eventId }, orderBy: { letter: "asc" } });
  const scores = await prisma.score.findMany({ where: { team: { eventId } } });

  const leaderboard = teams
    .map((team) => {
      const teamScores = scores.filter((s) => s.teamId === team.id);
      const judgeIds = new Set(teamScores.map((s) => s.judgeId));
      const totalPoints = teamScores.reduce((sum, s) => sum + s.points, 0);
      const averageScore = judgeIds.size > 0 ? totalPoints / judgeIds.size : 0;
      return {
        teamId: team.id,
        teamLetter: team.letter,
        teamName: team.name,
        averageScore: Math.round(averageScore * 100) / 100,
        judgeCount: judgeIds.size,
        totalPoints,
        rank: 0,
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  io.to(eventRoom(event.slug)).emit("leaderboard:update", leaderboard);
}
