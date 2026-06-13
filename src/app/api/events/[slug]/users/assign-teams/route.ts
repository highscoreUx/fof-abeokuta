import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { assignTeams, isTeamAssignAlgorithm } from "@/lib/team-assign";
import { guardTeamingEnabled } from "@/lib/team-settings-guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "user.assign_teams");
  if (ctx instanceof NextResponse) return ctx;

  const teamingGuard = await guardTeamingEnabled(ctx.event.id);
  if (teamingGuard) return teamingGuard;

  const body = await request.json().catch(() => ({}));
  const userIds = Array.isArray(body.userIds) ? body.userIds : undefined;
  const onlyUnassigned = typeof body.onlyUnassigned === "boolean" ? body.onlyUnassigned : undefined;
  const includeStaff = typeof body.includeStaff === "boolean" ? body.includeStaff : undefined;
  const algorithm =
    typeof body.algorithm === "string" && isTeamAssignAlgorithm(body.algorithm)
      ? body.algorithm
      : undefined;

  try {
    const users = await assignTeams(ctx.event.id, {
      userIds,
      onlyUnassigned,
      includeStaff,
      algorithm,
    });
    return NextResponse.json({
      assigned: users.length,
      users: users.map((u) => ({
        id: u.id,
        username: u.account.username,
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
