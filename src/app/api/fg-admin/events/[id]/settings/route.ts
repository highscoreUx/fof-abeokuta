import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { jsonError } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";
import {
  parseTeamingEnabled,
  setTeamingEnabled,
  TEAMING_ENABLED_KEY,
} from "@/lib/team-settings";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(_request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return jsonError("Event not found", "NOT_FOUND", 404);

  const setting = await prisma.appSetting.findUnique({
    where: { eventId_key: { eventId: event.id, key: TEAMING_ENABLED_KEY } },
  });

  return NextResponse.json({
    teamingEnabled: parseTeamingEnabled(setting?.value),
  });
}

const patchSchema = z.object({
  teamingEnabled: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return jsonError("Event not found", "NOT_FOUND", 404);

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.message, "VALIDATION_ERROR", 400);
  }

  await setTeamingEnabled(event.id, parsed.data.teamingEnabled, event.slug);

  return NextResponse.json({
    teamingEnabled: parsed.data.teamingEnabled,
  });
}
