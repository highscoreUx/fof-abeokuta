import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { getPlatformDashboardStats } from "@/lib/platform-dashboard.server";

export async function GET(request: NextRequest) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const stats = await getPlatformDashboardStats();
  return NextResponse.json(stats);
}
