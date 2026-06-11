import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { parseDmRoomId } from "@/lib/chat-dm";
import { isTeamChatEnabled } from "@/lib/chat-settings";
import { STAFF_CHAT_ROLE_SLUGS, STAFF_ROOM_ID } from "@/lib/chat-staff";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const participantSelect = {
  id: true,
  firstName: true,
  lastName: true,
  team: { select: { letter: true } },
  eventUserRole: { select: { name: true } },
} as const;

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
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json({
      participants: participants.map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        teamLetter: user.team?.letter ?? null,
        roleName: user.eventUserRole.name,
      })),
    });
  }

  if (roomId === STAFF_ROOM_ID) {
    if (!hasPermission(ctx.auth.permissions, "participant.staff_chat")) {
      return jsonError("Forbidden", "FORBIDDEN", 403);
    }

    const participants = await prisma.user.findMany({
      where: {
        eventId: ctx.event.id,
        eventUserRole: { slug: { in: [...STAFF_CHAT_ROLE_SLUGS] } },
      },
      select: participantSelect,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json({
      participants: participants.map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        teamLetter: user.team?.letter ?? null,
        roleName: user.eventUserRole.name,
      })),
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
      participants: [
        {
          id: peer.id,
          firstName: peer.firstName,
          lastName: peer.lastName,
          teamLetter: peer.team?.letter ?? null,
          roleName: peer.eventUserRole.name,
        },
      ],
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
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({
    participants: participants.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      teamLetter: user.team?.letter ?? null,
      roleName: user.eventUserRole.name,
    })),
  });
}
