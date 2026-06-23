import { BRAND_PRIMARY } from "@/lib/brand";
import {
  emailBrandHeaderHtml,
  emailShellHtml,
  escapeHtml,
} from "@/lib/email/brand-mark";

export interface ForgotPasswordEmailContent {
  firstName: string;
  resetUrl: string;
}

export function buildForgotPasswordEmail(content: ForgotPasswordEmailContent) {
  const subject = "Reset your password";

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Hi ${escapeHtml(content.firstName)},</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">We received a request to reset your password. Click the button below to choose a new one. This link expires in one hour.</p>
    <table role="presentation" cellspacing="0" cellpadding="0">
      <tr>
        <td style="border-radius:10px;background:${BRAND_PRIMARY};">
          <a href="${escapeHtml(content.resetUrl)}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Reset password</a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">If you did not request this, you can ignore this email. Your password will not change until you use the link above.</p>`;

  const html = emailShellHtml(
    emailBrandHeaderHtml("Reset your password"),
    body,
    "This message was sent because a password reset was requested for your account.",
  );

  const text = [
    `Hi ${content.firstName},`,
    "",
    "We received a request to reset your password.",
    `Reset your password: ${content.resetUrl}`,
    "",
    "This link expires in one hour.",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  return { subject, html, text };
}
