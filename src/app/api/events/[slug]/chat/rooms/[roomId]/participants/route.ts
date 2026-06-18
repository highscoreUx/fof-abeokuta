import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { parseDmRoomId } from "@/lib/chat-dm";
import { mapUserToChatParticipant } from "@/lib/chat-participants-server";
import { isTeamChatEnabled } from "@/lib/chat-settings";
import { STAFF_ROOM_ID } from "@/lib/chat-staff";
import { canAccessStaffChat } from "@/lib/account-permissions";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { resolveUserRolePermissions } from "@/lib/user-permissions";

const participantSelect = {
  id: true,
  permissions: true,
  account: { select: { username: true, firstName: true, lastName: true, permissions: true } },
  team: { select: { letter: true } },
} as const;

const participantOrderBy = [
  { account: { lastName: "asc" as const } },
  { account: { firstName: "asc" as const } },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; roomId: string }> },
) {
  const { slug, roomId } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  if (!hasPermission(ctx.auth.permissions, "participant.chat")) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  if (roomId === "global") {
    const participants = await prisma.user.findMany({
      where: { eventId: ctx.event.id },
      select: participantSelect,
      orderBy: participantOrderBy,
    });

    return NextResponse.json({
      participants: participants.map(mapUserToChatParticipant),
    });
  }

  if (roomId === STAFF_ROOM_ID) {
    if (!hasPermission(ctx.auth.permissions, "participant.staff_chat")) {
      return jsonError("Forbidden", "FORBIDDEN", 403);
    }

    const allUsers = await prisma.user.findMany({
      where: { eventId: ctx.event.id },
      select: participantSelect,
      orderBy: participantOrderBy,
    });

    return NextResponse.json({
      participants: allUsers
        .filter((user) => canAccessStaffChat(resolveUserRolePermissions(user)))
        .map(mapUserToChatParticipant),
    });
  }

  const peerId = parseDmRoomId(roomId);
  if (peerId) {
    const peer = await prisma.user.findFirst({
      where: { id: peerId, eventId: ctx.event.id },
      select: participantSelect,
    });
    if (!peer) return jsonError("User not found", "NOT_FOUND", 404);

    return NextResponse.json({
      participants: [mapUserToChatParticipant(peer)],
    });
  }

  if (ctx.auth.teamId !== roomId) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  if (!(await isTeamChatEnabled(ctx.event.id))) {
    return jsonError("Team chat is disabled", "FORBIDDEN", 403);
  }

  const participants = await prisma.user.findMany({
    where: { eventId: ctx.event.id, teamId: roomId },
    select: participantSelect,
    orderBy: participantOrderBy,
  });

  return NextResponse.json({
    participants: participants.map(mapUserToChatParticipant),
  });
}
