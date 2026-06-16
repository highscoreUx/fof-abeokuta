import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { getChatSocialGamesSettings } from "@/lib/chat-game-settings";
import { jsonError } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const settings = await getChatSocialGamesSettings(ctx.event.id);
  return NextResponse.json({ settings });
}
