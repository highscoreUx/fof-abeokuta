import type { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth/middleware";
import { isTeamingEnabled } from "@/lib/team-settings";

export async function guardTeamingEnabled(eventId: string): Promise<NextResponse | null> {
  if (!(await isTeamingEnabled(eventId))) {
    return jsonError("Teaming is disabled for this event", "TEAMING_DISABLED", 403);
  }
  return null;
}
