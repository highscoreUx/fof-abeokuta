import { NextRequest, NextResponse } from "next/server";
import { resetAccountPasswordForDelivery } from "@/lib/auth/reset-account-password";
import { deliverAccountCredentials } from "@/lib/account-credentials-notify";
import { requireEventPermission } from "@/lib/auth/event-middleware";
import { jsonError } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";
import { userWithAccountInclude } from "@/lib/user-display";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const ctx = await requireEventPermission(request, slug, "user.password.reset");
  if (ctx instanceof NextResponse) return ctx;

  const user = await prisma.user.findFirst({
    where: { id, eventId: ctx.event.id },
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
  const { emailQueued } = deliverAccountCredentials(
    user.accountId,
    password,
    "reset",
    `/${slug}/login`,
  );

  return NextResponse.json({
    ok: true,
    emailQueued,
    email: user.account.email,
  });
}
