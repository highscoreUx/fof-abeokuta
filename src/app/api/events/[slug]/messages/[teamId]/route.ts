import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import {
  chatUserSelect,
  createTeamChatMessage,
  serializeChatMessageRecord,
} from "@/lib/chat-messages-server";
import { isTeamChatEnabled } from "@/lib/chat-settings";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; teamId: string }> },
) {
  const { slug, teamId } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  if (ctx.auth.teamId !== teamId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!(await isTeamChatEnabled(ctx.event.id))) {
    return jsonError("Team chat is disabled", "FORBIDDEN", 403);
  }

  const messages = await prisma.message.findMany({
    where: { eventId: ctx.event.id, teamId },
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
  { params }: { params: Promise<{ slug: string; teamId: string }> },
) {
  const { slug, teamId } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  if (!hasPermission(ctx.auth.permissions, "participant.chat")) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  if (ctx.auth.teamId !== teamId) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  if (!(await isTeamChatEnabled(ctx.event.id))) {
    return jsonError("Team chat is disabled", "FORBIDDEN", 403);
  }

  const body = await request.json().catch(() => ({}));
  const content = (body as { content?: unknown }).content ?? body;

  try {
    const message = await createTeamChatMessage(
      ctx.event.id,
      slug,
      ctx.auth.userId,
      teamId,
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
