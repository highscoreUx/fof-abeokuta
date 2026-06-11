import { NextRequest, NextResponse } from "next/server";
import { requireEventContext, requireEventPermission } from "@/lib/auth/event-middleware";
import { hasPermission } from "@/lib/permissions";
import { voteConfigSchema } from "@/lib/validators/auth";
import { prisma } from "@/lib/prisma";
import { getIO } from "@/server/socket/io";
import { jsonError } from "@/lib/auth/middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  const votes = await prisma.vote.findMany({
    where: { eventId: ctx.event.id },
    include: { ballots: hasPermission(ctx.auth.permissions, "vote.manage") },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ votes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "vote.create");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const configParsed = voteConfigSchema.safeParse(body.config ?? {});
  if (!body.title || !configParsed.success) {
    return jsonError("Invalid vote data", "VALIDATION_ERROR", 400);
  }

  const vote = await prisma.vote.create({
    data: { eventId: ctx.event.id, title: body.title, config: configParsed.data },
  });

  return NextResponse.json({ vote });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "vote.manage");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  if (!body.id) return jsonError("Vote id required", "VALIDATION_ERROR", 400);

  const vote = await prisma.vote.updateMany({
    where: { id: body.id, eventId: ctx.event.id },
    data: { open: body.open ?? undefined },
  });

  if (vote.count === 0) return jsonError("Not found", "NOT_FOUND", 404);

  const updated = await prisma.vote.findUnique({ where: { id: body.id } });
  try {
    getIO().to(`event:${slug}`).emit("vote:state", updated);
  } catch {
    // ignore
  }

  return NextResponse.json({ vote: updated });
}
