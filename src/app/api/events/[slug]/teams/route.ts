import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const teams = await prisma.team.findMany({
    where: { eventId: ctx.event.id },
    orderBy: { letter: "asc" },
  });

  return NextResponse.json({ teams });
}
