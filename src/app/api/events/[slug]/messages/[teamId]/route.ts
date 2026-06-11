import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; teamId: string }> },
) {
  const { slug, teamId } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const messages = await prisma.message.findMany({
    where: { eventId: ctx.event.id, teamId },
    include: { user: { select: { username: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({ messages });
}
