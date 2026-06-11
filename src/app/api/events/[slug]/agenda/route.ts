import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventRole } from "@/lib/auth/event-middleware";
import { parseAgendaTemplate } from "@/lib/agenda-templates";
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

  const [items, templateSetting] = await Promise.all([
    prisma.agendaItem.findMany({
      where: {
        eventId: ctx.event.id,
        ...(ctx.auth.role === "PARTICIPANT" ? { visible: true } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
    }),
    prisma.appSetting.findUnique({
      where: { eventId_key: { eventId: ctx.event.id, key: "agenda_template" } },
    }),
  ]);

  return NextResponse.json({
    items,
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
  const ctx = await requireEventRole(request, slug, "ADMIN");
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

  return NextResponse.json({ item });
}
