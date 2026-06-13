import { BRAND_PRIMARY } from "@/lib/brand";
import { emailLogoHtml } from "@/lib/email/fof-logo-mark";

/** Compact branded header block for HTML emails (table-safe layout). */
export function emailBrandHeaderHtml(title: string, subtitle?: string): string {
  const subtitleBlock = subtitle
    ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:rgba(255,255,255,0.92);">${subtitle}</p>`
    : "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="background:${BRAND_PRIMARY};padding:28px 32px;">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:middle;padding-right:14px;">
                ${emailLogoHtml(56)}
              </td>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Friends of Figma Abeokuta</p>
                <h1 style="margin:4px 0 0;font-size:22px;line-height:1.3;font-weight:700;color:#ffffff;">${title}</h1>
                ${subtitleBlock}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

export function emailFooterHtml(note: string): string {
  return `
    <tr>
      <td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;">
        <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">Friends of Figma Abeokuta · ${note}</p>
      </td>
    </tr>`;
}

export function emailShellHtml(header: string, body: string, footerNote: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          ${header}
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          ${emailFooterHtml(footerNote)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
