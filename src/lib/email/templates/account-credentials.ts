import { BRAND_PRIMARY } from "@/lib/brand";
import {
  emailBrandHeaderHtml,
  emailShellHtml,
  escapeHtml,
} from "@/lib/email/brand-mark";

export type AccountCredentialsReason = "welcome" | "reset" | "check_in";

export interface AccountCredentialsEmailContent {
  firstName: string;
  email: string;
  username: string;
  password: string;
  loginUrl: string;
  reason: AccountCredentialsReason;
}

function reasonCopy(reason: AccountCredentialsReason) {
  switch (reason) {
    case "welcome":
      return {
        subject: "Your Friends of Figma account",
        headline: "Your account is ready",
        intro:
          "An account has been created for you on the Friends of Figma Abeokuta platform. Use the credentials below to sign in. You will be asked to choose a new password on first sign-in.",
        footer: "This message was sent because an account was created for you.",
      };
    case "reset":
      return {
        subject: "Your password has been reset",
        headline: "Password reset",
        intro:
          "Your password was reset by an administrator. Use the temporary password below to sign in. You will be asked to choose a new password when you sign in.",
        footer: "This message was sent because your password was reset.",
      };
    case "check_in":
      return {
        subject: "Your event sign-in details",
        headline: "Welcome — here are your sign-in details",
        intro:
          "Thanks for checking in. Use the credentials below to sign in to the event platform. You will be asked to choose a new password on first sign-in.",
        footer: "This message was sent because you checked in and provided your email.",
      };
  }
}

export function buildAccountCredentialsEmail(content: AccountCredentialsEmailContent) {
  const copy = reasonCopy(content.reason);
  const subject = copy.subject;

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Hi ${escapeHtml(content.firstName)},</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">${copy.intro}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 10px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">Sign-in details</p>
          <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Email:</strong> ${escapeHtml(content.email)}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Username:</strong> ${escapeHtml(content.username)}</p>
          <p style="margin:0;font-size:14px;color:#334155;"><strong>Temporary password:</strong> <code style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#e2e8f0;padding:2px 6px;border-radius:6px;">${escapeHtml(content.password)}</code></p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0">
      <tr>
        <td style="border-radius:10px;background:${BRAND_PRIMARY};">
          <a href="${escapeHtml(content.loginUrl)}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Sign in</a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b;">For security, do not share this email. If you did not expect this message, contact the event team.</p>`;

  const html = emailShellHtml(
    emailBrandHeaderHtml(copy.headline),
    body,
    copy.footer,
  );

  const text = [
    `Hi ${content.firstName},`,
    "",
    copy.intro,
    "",
    "Sign-in details:",
    `Email: ${content.email}`,
    `Username: ${content.username}`,
    `Temporary password: ${content.password}`,
    "",
    `Sign in: ${content.loginUrl}`,
    "",
    "Friends of Figma Abeokuta",
  ].join("\n");

  return { subject, html, text };
}
