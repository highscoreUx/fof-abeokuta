import { NextRequest, NextResponse } from "next/server";
import { resetAccountPasswordForDelivery } from "@/lib/auth/reset-account-password";
import { deliverAccountCredentials } from "@/lib/account-credentials-notify";
import { jsonError } from "@/lib/auth/middleware";
import { requirePlatformAuth } from "@/lib/platform-auth/middleware";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requirePlatformAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    return jsonError("Member not found", "NOT_FOUND", 404);
  }

  if (!account.email?.trim()) {
    return jsonError(
      "This member has no email address yet. Add an email before resetting the password.",
      "NO_EMAIL",
      400,
    );
  }

  const password = await resetAccountPasswordForDelivery(account.id);
  const { emailQueued } = deliverAccountCredentials(account.id, password, "reset");

  return NextResponse.json({
    ok: true,
    emailQueued,
    email: account.email,
  });
}
