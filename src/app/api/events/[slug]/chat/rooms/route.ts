import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { dmRoomId } from "@/lib/chat-dm";
import { isTeamChatEnabled } from "@/lib/chat-settings";
import { STAFF_ROOM_ID } from "@/lib/chat-staff";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const rooms: Array<{
    id: string;
    category: "general" | "team" | "private" | "staff";
    label: string;
    letter?: string;
    name?: string;
  }> = [{ id: "global", category: "general", label: "General" }];

  if (hasPermission(ctx.auth.permissions, "participant.staff_chat")) {
    rooms.push({ id: STAFF_ROOM_ID, category: "staff", label: "Staff" });
  }

  const teamChatEnabled = await isTeamChatEnabled(ctx.event.id);

  if (teamChatEnabled && ctx.auth.teamId) {
    const team = await prisma.team.findFirst({
      where: { id: ctx.auth.teamId, eventId: ctx.event.id },
      select: { id: true, letter: true, name: true },
    });
    if (team) {
      rooms.push({
        id: team.id,
        category: "team",
        label: `Team ${team.letter}`,
        letter: team.letter,
        name: team.name,
      });
    }
  }

  const dmMessages = await prisma.message.findMany({
    where: {
      eventId: ctx.event.id,
      recipientId: { not: null },
      OR: [{ userId: ctx.auth.userId }, { recipientId: ctx.auth.userId }],
    },
    select: {
      userId: true,
      recipientId: true,
      user: { select: { id: true, account: { select: { firstName: true, lastName: true } } } },
      recipient: { select: { id: true, account: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const seenPeers = new Set<string>();
  for (const message of dmMessages) {
    const peer =
      message.userId === ctx.auth.userId ? message.recipient : message.user;
    if (!peer || seenPeers.has(peer.id)) continue;
    seenPeers.add(peer.id);
    rooms.push({
      id: dmRoomId(peer.id),
      category: "private",
      label: `${peer.account.firstName} ${peer.account.lastName}`,
    });
  }

  return NextResponse.json({ rooms });
}
