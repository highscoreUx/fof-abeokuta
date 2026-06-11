import { createAgendaSystemMessage, type AgendaSystemAction } from "@/lib/chat-system";
import { formatAgendaTimeRange } from "@/lib/agenda-format";
import { isTeamChatEnabled } from "@/lib/chat-settings";
import { STAFF_ROOM_ID } from "@/lib/chat-staff";
import { prisma } from "@/lib/prisma";
import { tryGetIO } from "@/server/socket/io";
import { eventRoom, staffRoom, teamRoom } from "@/server/socket/rooms";
import type { ChatMessage } from "@/types/chat";

export async function broadcastSystemMessageToGroupChats(
  eventId: string,
  eventSlug: string,
  message: ChatMessage,
) {
  const io = tryGetIO();
  if (!io) return;

  const targets: Array<{ roomId: string; socketRoom: string }> = [
    { roomId: "global", socketRoom: eventRoom(eventSlug) },
    { roomId: STAFF_ROOM_ID, socketRoom: staffRoom(eventSlug) },
  ];

  const teamChatEnabled = await isTeamChatEnabled(eventId);
  if (teamChatEnabled) {
    const teams = await prisma.team.findMany({
      where: { eventId },
      select: { id: true, letter: true },
    });

    for (const team of teams) {
      targets.push({ roomId: team.id, socketRoom: teamRoom(eventSlug, team.letter) });
    }
  }

  for (const target of targets) {
    io.to(target.socketRoom).emit("chat:system", {
      ...message,
      system: true,
      targetRoomId: target.roomId,
    });
  }
}

export async function broadcastAgendaUpdate(
  eventId: string,
  eventSlug: string,
  action: AgendaSystemAction,
  title: string,
  startTime?: string,
  endTime?: string,
) {
  const timeRange =
    startTime && endTime ? formatAgendaTimeRange(startTime, endTime) : undefined;
  const message = createAgendaSystemMessage(action, title, timeRange);
  await broadcastSystemMessageToGroupChats(eventId, eventSlug, message);
}

export const AGENDA_PRESENT_SETTING_KEY = "agenda_present_item_id";

export async function getPresentAgendaItemId(eventId: string): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({
    where: { eventId_key: { eventId, key: AGENDA_PRESENT_SETTING_KEY } },
  });
  return setting?.value ?? null;
}

export async function setPresentAgendaItemId(
  eventId: string,
  itemId: string | null,
): Promise<void> {
  if (itemId === null) {
    await prisma.appSetting.deleteMany({
      where: { eventId, key: AGENDA_PRESENT_SETTING_KEY },
    });
    return;
  }

  await prisma.appSetting.upsert({
    where: { eventId_key: { eventId, key: AGENDA_PRESENT_SETTING_KEY } },
    create: { eventId, key: AGENDA_PRESENT_SETTING_KEY, value: itemId },
    update: { value: itemId },
  });
}
