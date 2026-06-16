import { NextRequest, NextResponse } from "next/server";
import { requireEventContext } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventContext(request, slug);
  if (ctx instanceof NextResponse) return ctx;

  if (!hasPermission(ctx.auth.permissions, "participant.chat")) {
    return jsonError("Forbidden", "FORBIDDEN", 403);
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const users = await prisma.user.findMany({
    where: {
      eventId: ctx.event.id,
      id: { not: ctx.auth.userId },
      ...(q
        ? {
            OR: [
              { account: { firstName: { contains: q, mode: "insensitive" } } },
              { account: { lastName: { contains: q, mode: "insensitive" } } },
              { account: { username: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      account: { select: { firstName: true, lastName: true, username: true } },
    },
    orderBy: { account: { firstName: "asc" } },
    take: 12,
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      firstName: user.account.firstName,
      lastName: user.account.lastName,
      username: user.account.username,
    })),
  });
}
