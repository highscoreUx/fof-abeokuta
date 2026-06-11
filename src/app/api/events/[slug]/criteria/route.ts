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

  const criteria = await prisma.scoreCriterion.findMany({
    where: { eventId: ctx.event.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ criteria });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventRole(request, slug, "ADMIN");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const criterion = await prisma.scoreCriterion.create({
    data: {
      eventId: ctx.event.id,
      name: body.name,
      maxPoints: body.maxPoints ?? 25,
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return NextResponse.json({ criterion });
}
