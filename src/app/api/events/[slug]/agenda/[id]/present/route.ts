import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import {
  broadcastAgendaUpdate,
  getPresentAgendaItemId,
  setPresentAgendaItemId,
} from "@/lib/agenda-chat-broadcast";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "agenda.update");
  if (ctx instanceof NextResponse) return ctx;

  const item = await prisma.agendaItem.findFirst({
    where: { id, eventId: ctx.event.id },
  });
  if (!item) return jsonError("Not found", "NOT_FOUND", 404);

  const body = await request.json().catch(() => ({}));
  const clear = Boolean((body as { clear?: boolean }).clear);

  if (clear) {
    const current = await getPresentAgendaItemId(ctx.event.id);
    if (current === id) {
      await setPresentAgendaItemId(ctx.event.id, null);
      await broadcastAgendaUpdate(ctx.event.id, slug, "cleared", item.title);
    }
    return NextResponse.json({ presentItemId: null });
  }

  await setPresentAgendaItemId(ctx.event.id, id);
  await broadcastAgendaUpdate(
    ctx.event.id,
    slug,
    "present",
    item.title,
    item.startTime.toISOString(),
    item.endTime.toISOString(),
  );

  return NextResponse.json({ presentItemId: id });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "agenda.update");
  if (ctx instanceof NextResponse) return ctx;

  const current = await getPresentAgendaItemId(ctx.event.id);
  if (current !== id) {
    return NextResponse.json({ presentItemId: current });
  }

  const item = await prisma.agendaItem.findFirst({
    where: { id, eventId: ctx.event.id },
  });

  await setPresentAgendaItemId(ctx.event.id, null);
  if (item) {
    await broadcastAgendaUpdate(ctx.event.id, slug, "cleared", item.title);
  }

  return NextResponse.json({ presentItemId: null });
}
