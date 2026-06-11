import { NextRequest, NextResponse } from "next/server";
import { requireEventRole } from "@/lib/auth/event-middleware";
import { assignTeams, isTeamAssignAlgorithm } from "@/lib/team-assign";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventRole(request, slug, "ADMIN");
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json().catch(() => ({}));
  const userIds = Array.isArray(body.userIds) ? body.userIds : undefined;
  const onlyUnassigned = typeof body.onlyUnassigned === "boolean" ? body.onlyUnassigned : undefined;
  const algorithm =
    typeof body.algorithm === "string" && isTeamAssignAlgorithm(body.algorithm)
      ? body.algorithm
      : undefined;

  try {
    const users = await assignTeams(ctx.event.id, { userIds, onlyUnassigned, algorithm });
    return NextResponse.json({
      assigned: users.length,
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        teamLetter: u.team?.letter ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign teams" },
      { status: 400 },
    );
  }
}
