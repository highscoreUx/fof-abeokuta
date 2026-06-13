import { BRAND_PRIMARY } from "@/lib/brand";
import type { EmailAgendaPayload } from "@/lib/email/agenda-for-email";

export interface CheckInWelcomeEmailContent {
  firstName: string;
  eventSlug: string;
  loginUrl: string;
  agenda: EmailAgendaPayload;
  teamLetter?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function agendaHtml(agenda: EmailAgendaPayload): string {
  if (agenda.items.length === 0) {
    return `<p style="margin:0;color:#64748b;font-size:15px;line-height:1.6;">The agenda for today will be shared at the event.</p>`;
  }

  const rows = agenda.items
    .map(
      (item) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e2e8f0;vertical-align:top;width:120px;">
          <span style="font-size:13px;font-weight:600;color:${BRAND_PRIMARY};white-space:nowrap;">${escapeHtml(item.timeRange)}</span>
        </td>
        <td style="padding:14px 0 14px 16px;border-bottom:1px solid #e2e8f0;vertical-align:top;">
          <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${escapeHtml(item.title)}</p>
          ${
            item.description
              ? `<p style="margin:6px 0 0;font-size:14px;line-height:1.5;color:#64748b;">${escapeHtml(item.description)}</p>`
              : ""
          }
        </td>
      </tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      ${rows}
    </table>`;
}

function agendaText(agenda: EmailAgendaPayload): string {
  if (agenda.items.length === 0) {
    return "The agenda for today will be shared at the event.";
  }

  return agenda.items
    .map((item) => {
      const desc = item.description ? `\n  ${item.description}` : "";
      return `${item.timeRange} — ${item.title}${desc}`;
    })
    .join("\n\n");
}

export function buildCheckInWelcomeEmail(content: CheckInWelcomeEmailContent) {
  const { firstName, loginUrl, agenda, teamLetter } = content;
  const subject = `You're checked in — ${agenda.eventTitle}`;

  const teamLine = teamLetter
    ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">You're on <strong>Team ${escapeHtml(teamLetter)}</strong>.</p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:${BRAND_PRIMARY};padding:28px 32px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Friends of Figma</p>
              <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#ffffff;">Welcome, ${escapeHtml(firstName)}!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">${escapeHtml(agenda.eventDayLabel)} · ${escapeHtml(agenda.eventDateLabel)}</p>
              <h2 style="margin:0 0 16px;font-size:20px;line-height:1.4;color:#0f172a;">You're checked in to ${escapeHtml(agenda.eventTitle)}</h2>
              ${teamLine}
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">Here's your agenda for the day. Sign in anytime with the email and password you registered with.</p>
              <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;">Today's agenda</h3>
              ${agendaHtml(agenda)}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:28px;">
                <tr>
                  <td style="border-radius:10px;background:${BRAND_PRIMARY};">
                    <a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Sign in to the event</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">Friends of Figma Abeokuta · This message was sent because you were checked in to the event.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Welcome, ${firstName}!`,
    "",
    `You're checked in to ${agenda.eventTitle}.`,
    `${agenda.eventDayLabel} · ${agenda.eventDateLabel}`,
    teamLetter ? `Team ${teamLetter}` : "",
    "",
    "Today's agenda:",
    agendaText(agenda),
    "",
    `Sign in: ${loginUrl}`,
    "",
    "Friends of Figma Abeokuta",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
