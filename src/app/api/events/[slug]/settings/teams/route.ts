import { NextRequest, NextResponse } from "next/server";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import {
  getTeamAssignSettings,
  isTeamAssignAlgorithm,
  saveTeamAssignSettings,
} from "@/lib/team-assign";
import { guardTeamingEnabled } from "@/lib/team-settings-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "settings.auto_assign");
  if (ctx instanceof NextResponse) return ctx;

  const teamingGuard = await guardTeamingEnabled(ctx.event.id);
  if (teamingGuard) return teamingGuard;

  const settings = await getTeamAssignSettings(ctx.event.id);
  return NextResponse.json({ settings });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await requireEventPermission(request, slug, "settings.auto_assign");
  if (ctx instanceof NextResponse) return ctx;

  const teamingGuard = await guardTeamingEnabled(ctx.event.id);
  if (teamingGuard) return teamingGuard;

  const body = (await request.json()) as {
    algorithm?: string;
    autoAssignOnImport?: boolean;
    onlyUnassigned?: boolean;
    includeStaff?: boolean;
  };

  if (body.algorithm !== undefined && !isTeamAssignAlgorithm(body.algorithm)) {
    return NextResponse.json({ error: "Invalid assignment algorithm" }, { status: 400 });
  }

  try {
    const settings = await saveTeamAssignSettings(ctx.event.id, {
      ...(body.algorithm !== undefined ? { algorithm: body.algorithm } : {}),
      ...(body.autoAssignOnImport !== undefined
        ? { autoAssignOnImport: body.autoAssignOnImport }
        : {}),
      ...(body.onlyUnassigned !== undefined ? { onlyUnassigned: body.onlyUnassigned } : {}),
      ...(body.includeStaff !== undefined ? { includeStaff: body.includeStaff } : {}),
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save settings" },
      { status: 400 },
    );
  }
}
