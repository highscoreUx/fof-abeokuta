import { NextRequest, NextResponse } from "next/server";
import { authenticateAccountRequest } from "@/lib/auth/account-request";
import { resolveEventMembership } from "@/lib/auth/event-access";
import { jsonError } from "@/lib/auth/middleware";
import { loadEnabledActivitiesSnapshot } from "@/lib/activities/event-activities";
import { serializeUser } from "@/lib/users";
import { userWithAccountInclude } from "@/lib/user-display";
import { resolveUserPermissionList } from "@/lib/user-permissions";
import { prisma } from "@/lib/prisma";
import { getEventBySlug } from "@/lib/events";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const accountAuth = authenticateAccountRequest(request);
  if (!accountAuth) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const membership = await resolveEventMembership(accountAuth.accountId, slug);
  if (membership.status === "EVENT_NOT_FOUND") {
    return jsonError("Event not found", "NOT_FOUND", 404);
  }

  if (membership.status === "NOT_REGISTERED") {
    return NextResponse.json({ registered: false, eventSlug: slug });
  }

  if (membership.status === "CHECK_IN_REQUIRED") {
    const event = await getEventBySlug(slug);
    const user = await prisma.user.findUnique({
      where: {
        accountId_eventId: { accountId: accountAuth.accountId, eventId: event!.id },
      },
      include: userWithAccountInclude,
    });
    const permissions = user ? resolveUserPermissionList(user) : [];
    const enabledActivities = event ? await loadEnabledActivitiesSnapshot(event.id) : [];
    return NextResponse.json({
      registered: true,
      checkInRequired: true,
      eventSlug: slug,
      user: user ? serializeUser(user, slug, permissions, enabledActivities) : null,
    });
  }

  return NextResponse.json({
    registered: true,
    checkInRequired: false,
    eventSlug: slug,
    user: membership.user,
  });
}
