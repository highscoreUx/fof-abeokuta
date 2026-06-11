import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { castChatPollVote } from "@/lib/chat-messages-server";
import { hasPermission } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; messageId: string }> },
) {
  const { slug, messageId } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  if (!hasPermission(ctx.auth.permissions, "participant.chat")) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  const body = await request.json().catch(() => ({}));
  const optionIndex = (body as { optionIndex?: unknown }).optionIndex;
  if (typeof optionIndex !== "number" || !Number.isInteger(optionIndex)) {
    return jsonError("Invalid option", "VALIDATION_ERROR", 400);
  }

  try {
    const message = await castChatPollVote(
      ctx.event.id,
      slug,
      messageId,
      ctx.auth.userId,
      optionIndex,
    );
    return NextResponse.json({ message });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to vote",
      "VALIDATION_ERROR",
      400,
    );
  }
}
