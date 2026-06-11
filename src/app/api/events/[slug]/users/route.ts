import { NextRequest, NextResponse } from "next/server";
import { requireEventRole } from "@/lib/auth/event-middleware";
import { prisma } from "@/lib/prisma";
import { canViewPassword } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventRole(request, slug, "STAFF");
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase();
  const role = searchParams.get("role");

  const users = await prisma.user.findMany({
    where: {
      eventId: ctx.event.id,
      ...(role ? { role: role as "ADMIN" | "STAFF" | "JUDGE" | "PARTICIPANT" } : {}),
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { team: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      teamLetter: user.team?.letter ?? null,
      checkedInAt: user.checkedInAt,
      loginPhrase: user.loginPhrase,
      password: canViewPassword(ctx.auth.role, user.role, user.pinDisplay)
        ? user.pinDisplay
        : undefined,
    })),
  });
}
