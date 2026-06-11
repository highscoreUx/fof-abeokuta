import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { hasPermission } from "@/lib/permissions";
import { parseAgendaTemplate } from "@/lib/agenda-templates";
import {
  broadcastAgendaUpdate,
  getPresentAgendaItemId,
} from "@/lib/agenda-chat-broadcast";
import { agendaItemSchema } from "@/lib/validators/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const [items, templateSetting, presentItemId] = await Promise.all([
    prisma.agendaItem.findMany({
      where: {
        eventId: ctx.event.id,
        ...(!hasPermission(ctx.auth.permissions, "agenda.list") ? { visible: true } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
    }),
    prisma.appSetting.findUnique({
      where: { eventId_key: { eventId: ctx.event.id, key: "agenda_template" } },
    }),
    getPresentAgendaItemId(ctx.event.id),
  ]);

  return NextResponse.json({
    items,
    presentItemId,
    template: parseAgendaTemplate(templateSetting?.value),
    event: {
      title: ctx.event.title,
      date: ctx.event.date.toISOString(),
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "agenda.create");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = agendaItemSchema.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);

  const item = await prisma.agendaItem.create({
    data: {
      eventId: ctx.event.id,
      title: parsed.data.title,
      description: parsed.data.description,
      startTime: new Date(parsed.data.startTime),
      endTime: new Date(parsed.data.endTime),
      sortOrder: parsed.data.sortOrder ?? 0,
      visible: parsed.data.visible ?? true,
    },
  });

  await broadcastAgendaUpdate(
    ctx.event.id,
    slug,
    "created",
    item.title,
    item.startTime.toISOString(),
    item.endTime.toISOString(),
  );

  return NextResponse.json({ item });
}
