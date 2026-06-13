import { createBrevoTransport } from "@/server/email-worker/adapters/brevo";
import { createHttpApiTransport } from "@/server/email-worker/adapters/http-api";
import { createSmtpNodemailerTransport } from "@/server/email-worker/adapters/smtp-nodemailer";
import type { EmailSendOptions, EmailTransportAdapter } from "@/server/email-worker/adapters/types";
import { getEmailProvider } from "@/server/email-worker/config";

let adapter: EmailTransportAdapter | null = null;

export function getEmailTransport(): EmailTransportAdapter {
  if (adapter) return adapter;

  const provider = getEmailProvider();
  if (provider === "brevo") {
    adapter = createBrevoTransport();
  } else if (provider === "http") {
    adapter = createHttpApiTransport();
  } else if (provider === "smtp") {
    adapter = createSmtpNodemailerTransport();
  } else {
    throw new Error("Email transport is not configured");
  }

  return adapter;
}

export async function sendMail(options: EmailSendOptions): Promise<void> {
  await getEmailTransport().send(options);
}

export type { EmailSendOptions, EmailTransportAdapter };
