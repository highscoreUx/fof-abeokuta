import { BRAND_PRIMARY } from "@/lib/brand";
import {
  emailBrandHeaderHtml,
  emailFooterHtml,
  emailShellHtml,
  escapeHtml,
} from "@/lib/email/brand-mark";
import type { EmailAgendaPayload } from "@/lib/email/agenda-for-email";

export interface CheckInWelcomeEmailContent {
  firstName: string;
  eventSlug: string;
  loginUrl: string;
  agenda: EmailAgendaPayload;
  teamLetter?: string | null;
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

  const html = emailShellHtml(
    emailBrandHeaderHtml(`Welcome, ${escapeHtml(firstName)}!`),
    `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">${escapeHtml(agenda.eventDayLabel)} · ${escapeHtml(agenda.eventDateLabel)}</p>
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
              </table>`,
    "This message was sent because you were checked in to the event.",
  );

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
