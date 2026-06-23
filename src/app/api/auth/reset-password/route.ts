import { NextRequest, NextResponse } from "next/server";
import { changeAccountPassword } from "@/lib/accounts";
import { resetPasswordBodySchema } from "@/lib/auth/password-policy";
import {
  consumePasswordResetToken,
  findValidPasswordResetAccountId,
  revokeAllRefreshTokensForAccount,
} from "@/lib/auth/password-reset";
import { jsonError } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ valid: false });
  }

  const accountId = await findValidPasswordResetAccountId(token);
  return NextResponse.json({ valid: Boolean(accountId) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = resetPasswordBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request", "VALIDATION_ERROR", 400);
  }

  const accountId = await consumePasswordResetToken(parsed.data.token);
  if (!accountId) {
    return jsonError(
      "This reset link is invalid or has expired. Request a new one from the sign-in page.",
      "INVALID_TOKEN",
      400,
    );
  }

  await changeAccountPassword(accountId, parsed.data.newPassword);
  await revokeAllRefreshTokensForAccount(accountId);

  return NextResponse.json({ ok: true });
}
