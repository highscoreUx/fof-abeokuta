import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { parseAgendaTemplate } from "@/lib/agenda-templates";
import { parseTeamChatEnabled, setTeamChatEnabled, TEAM_CHAT_ENABLED_KEY } from "@/lib/chat-settings";
import { hasPermission } from "@/lib/permissions";
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
    agendaTemplate: parseAgendaTemplate(map.agenda_template),
    teamChatEnabled: parseTeamChatEnabled(map[TEAM_CHAT_ENABLED_KEY]),
    sponsors,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();

  const hasBroadcastingFields =
    body.youtubeVideoId !== undefined ||
    body.streamLive !== undefined ||
    body.agendaTemplate !== undefined;
  const hasChatFields = body.teamChatEnabled !== undefined;

  if (hasBroadcastingFields && !hasPermission(ctx.auth.permissions, "settings.broadcasting")) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  if (hasChatFields && !hasPermission(ctx.auth.permissions, "team.manage")) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

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

  if (body.agendaTemplate !== undefined) {
    const template = parseAgendaTemplate(body.agendaTemplate);
    await prisma.appSetting.upsert({
      where: { eventId_key: { eventId: ctx.event.id, key: "agenda_template" } },
      create: { eventId: ctx.event.id, key: "agenda_template", value: template },
      update: { value: template },
    });
  }

  if (body.teamChatEnabled !== undefined) {
    await setTeamChatEnabled(ctx.event.id, Boolean(body.teamChatEnabled), slug);
  }

  return NextResponse.json({ success: true });
}
