import { createCheckInSystemMessage } from "@/lib/chat-system";
import { isTeamChatEnabled } from "@/lib/chat-settings";
import { tryGetIO } from "@/server/socket/io";
import { eventRoom, teamRoom, userRoom } from "@/server/socket/rooms";

interface CheckedInUser {
  id: string;
  firstName: string;
  lastName: string;
  teamId?: string | null;
  team?: { letter: string } | null;
}

export async function broadcastCheckInAnnouncement(
  eventSlug: string,
  user: CheckedInUser,
  eventId?: string,
) {
  const io = tryGetIO();
  if (!io) return;

  const message = createCheckInSystemMessage(
    user.firstName,
    user.lastName,
    user.team?.letter ?? null,
  );
  const exceptRoom = userRoom(user.id);

  io.to(eventRoom(eventSlug)).except(exceptRoom).emit("chat:system", {
    ...message,
    system: true,
    targetRoomId: "global",
  });

  if (user.teamId && user.team?.letter && eventId && (await isTeamChatEnabled(eventId))) {
    io.to(teamRoom(eventSlug, user.team.letter)).except(exceptRoom).emit("chat:system", {
      ...message,
      system: true,
      targetRoomId: user.teamId,
    });
  }
}
