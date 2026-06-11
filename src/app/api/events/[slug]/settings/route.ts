import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventRole } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const settings = await prisma.appSetting.findMany({ where: { eventId: ctx.event.id } });
  const sponsors = await prisma.sponsor.findMany({ where: { eventId: ctx.event.id } });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return NextResponse.json({
    youtubeVideoId: map.youtube_video_id ?? "",
    streamLive: map.stream_live === "true",
    sponsors,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventRole(request, slug, "ADMIN");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();

  if (body.youtubeVideoId !== undefined) {
    await prisma.appSetting.upsert({
      where: { eventId_key: { eventId: ctx.event.id, key: "youtube_video_id" } },
      create: { eventId: ctx.event.id, key: "youtube_video_id", value: body.youtubeVideoId },
      update: { value: body.youtubeVideoId },
    });
  }

  if (body.streamLive !== undefined) {
    await prisma.appSetting.upsert({
      where: { eventId_key: { eventId: ctx.event.id, key: "stream_live" } },
      create: { eventId: ctx.event.id, key: "stream_live", value: String(body.streamLive) },
      update: { value: String(body.streamLive) },
    });
  }

  return NextResponse.json({ success: true });
}
