import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { agendaItemSchema } from "@/lib/validators/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth/middleware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "agenda.update");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = agendaItemSchema.partial().safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);

  const item = await prisma.agendaItem.updateMany({
    where: { id, eventId: ctx.event.id },
    data: {
      ...parsed.data,
      startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : undefined,
      endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : undefined,
    },
  });

  if (item.count === 0) return jsonError("Not found", "NOT_FOUND", 404);
  const updated = await prisma.agendaItem.findUnique({ where: { id } });
  return NextResponse.json({ item: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "agenda.delete");
  if (ctx instanceof NextResponse) return ctx;

  await prisma.agendaItem.deleteMany({ where: { id, eventId: ctx.event.id } });
  return NextResponse.json({ success: true });
}
