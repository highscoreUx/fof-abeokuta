/** Worker-owned env config. No Next.js or app imports. */

export const EMAIL_QUEUE_NAME = "fof.email";

export function isQueueConfigured(): boolean {
  return Boolean(process.env.CLOUDAMQP_URL?.trim());
}

export function getCloudAmqpUrl(): string {
  const url = process.env.CLOUDAMQP_URL?.trim();
  if (!url) {
    throw new Error("CLOUDAMQP_URL is not configured");
  }
  return url;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM,
  );
}

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error("SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM required)");
  }

  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure =
    process.env.SMTP_SECURE === "true" || (process.env.SMTP_SECURE === undefined && port === 465);

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    from,
    fromName: process.env.SMTP_FROM_NAME ?? "Friends of Figma Abeokuta",
  };
}
