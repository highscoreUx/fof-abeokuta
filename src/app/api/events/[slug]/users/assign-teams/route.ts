import { NextRequest, NextResponse } from "next/server";
import { requireEventRole } from "@/lib/auth/event-middleware";
import { assignTeamsBalanced } from "@/lib/users";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventRole(request, slug, "ADMIN");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json().catch(() => ({}));
  const userIds = Array.isArray(body.userIds) ? body.userIds : undefined;
  const users = await assignTeamsBalanced(ctx.event.id, userIds);

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      teamLetter: u.team?.letter ?? null,
    })),
  });
}
