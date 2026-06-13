/** Worker-owned env config. No Next.js or app imports. */

export const EMAIL_QUEUE_NAME = "fof.email";

/** Concurrent in-flight jobs when delivery is HTTPS (custom API / Brevo). SMTP stays serial. */
export const HTTP_EMAIL_PREFETCH = 5;
export const SMTP_EMAIL_PREFETCH = 1;

export type EmailProvider = "smtp" | "brevo" | "http";

function hasSenderEmail(): boolean {
  return Boolean(
    process.env.EMAIL_FROM?.trim() ||
      process.env.SMTP_FROM?.trim() ||
      process.env.BREVO_FROM?.trim(),
  );
}

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

export function getEmailSender() {
  const email =
    process.env.EMAIL_FROM?.trim() ??
    process.env.SMTP_FROM?.trim() ??
    process.env.BREVO_FROM?.trim();
  const name =
    process.env.EMAIL_FROM_NAME?.trim() ??
    process.env.SMTP_FROM_NAME?.trim() ??
    process.env.BREVO_FROM_NAME?.trim() ??
    "Friends of Figma Abeokuta";

  if (!email) {
    throw new Error(
      "Sender email is not configured (EMAIL_FROM, SMTP_FROM, or BREVO_FROM required)",
    );
  }

  return { email, name };
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim() &&
      hasSenderEmail(),
  );
}

export function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY?.trim() && hasSenderEmail());
}

export function isHttpApiConfigured(): boolean {
  return Boolean(
    process.env.EMAIL_API_URL?.trim() &&
      process.env.EMAIL_API_KEY?.trim() &&
      hasSenderEmail(),
  );
}

export function getEmailProvider(): EmailProvider | null {
  const explicit = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (explicit === "brevo") return isBrevoConfigured() ? "brevo" : null;
  if (explicit === "http" || explicit === "api" || explicit === "custom") {
    return isHttpApiConfigured() ? "http" : null;
  }
  if (explicit === "smtp" || explicit === "nodemailer") {
    return isSmtpConfigured() ? "smtp" : null;
  }
  if (isHttpApiConfigured()) return "http";
  if (isBrevoConfigured()) return "brevo";
  if (isSmtpConfigured()) return "smtp";
  return null;
}

export function isEmailConfigured(): boolean {
  return getEmailProvider() !== null;
}

export function getEmailPrefetchCount(provider: EmailProvider | null = getEmailProvider()): number {
  if (provider === "http" || provider === "brevo") return HTTP_EMAIL_PREFETCH;
  return SMTP_EMAIL_PREFETCH;
}

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS required)");
  }

  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure =
    process.env.SMTP_SECURE === "true" ||
    (process.env.SMTP_SECURE === undefined && port === 465);
  const sender = getEmailSender();

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    from: sender.email,
    fromName: sender.name,
  };
}

export function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const sender = getEmailSender();
  return {
    apiKey,
    sender,
  };
}

export function getHttpApiConfig() {
  const apiUrl = process.env.EMAIL_API_URL?.trim();
  const apiKey = process.env.EMAIL_API_KEY?.trim();
  if (!apiUrl) {
    throw new Error("EMAIL_API_URL is not configured");
  }
  if (!apiKey) {
    throw new Error("EMAIL_API_KEY is not configured");
  }

  const sender = getEmailSender();
  return {
    apiUrl,
    apiKey,
    sender,
  };
}
