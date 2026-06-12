import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import {
  chatUserSelect,
  createDirectChatMessage,
  serializeChatMessageRecord,
} from "@/lib/chat-messages-server";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise< { slug: string; userId: string }> },
) {
  const { slug, userId: peerId } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  if (!hasPermission(ctx.auth.permissions, "participant.chat")) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  const peer = await prisma.user.findFirst({
    where: { id: peerId, eventId: ctx.event.id },
    select: { id: true },
  });
  if (!peer) return jsonError("User not found", "NOT_FOUND", 404);

  const myId = ctx.auth.userId;
  const messages = await prisma.message.findMany({
    where: {
      eventId: ctx.event.id,
      recipientId: { not: null },
      OR: [
        { userId: myId, recipientId: peerId },
        { userId: peerId, recipientId: myId },
      ],
    },
    include: { user: chatUserSelect },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({
    messages: messages.map((message) => serializeChatMessageRecord(message)),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise< { slug: string; userId: string }> },
) {
  const { slug, userId: peerId } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  if (!hasPermission(ctx.auth.permissions, "participant.chat")) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  const body = await request.json().catch(() => ({}));
  const content = (body as { content?: unknown }).content ?? body;

  try {
    const message = await createDirectChatMessage(
      ctx.event.id,
      ctx.auth.userId,
      peerId,
      content,
    );
    return NextResponse.json({ message });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to send message",
      "VALIDATION_ERROR",
      400,
    );
  }
}
