import { NextRequest, NextResponse } from "next/server";
import { resetAccountPasswordForDelivery } from "@/lib/auth/reset-account-password";
import { deliverAccountCredentials } from "@/lib/account-credentials-notify";
import { jsonError } from "@/lib/auth/middleware";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";
import { userWithAccountInclude } from "@/lib/user-display";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id: eventId, userId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return jsonError("Event not found", "NOT_FOUND", 404);

  const user = await prisma.user.findFirst({
    where: { id: userId, eventId },
    include: userWithAccountInclude,
  });
  if (!user) return jsonError("User not found", "NOT_FOUND", 404);

  if (!user.account.email?.trim()) {
    return jsonError(
      "This participant has no email address yet.",
      "NO_EMAIL",
      400,
    );
  }

  const password = await resetAccountPasswordForDelivery(user.accountId);
  const { emailQueued } = deliverAccountCredentials(user.accountId, password, "reset", "/login");

  return NextResponse.json({
    ok: true,
    emailQueued,
    email: user.account.email,
  });
}
