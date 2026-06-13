import type { EmailSendOptions } from "@/server/email-worker/adapters/types";

export interface BrevoStyleSender {
  name: string;
  email: string;
}

export interface BrevoStyleSendPayload {
  sender: BrevoStyleSender;
  to: Array<{ email: string }>;
  subject: string;
  htmlContent: string;
  textContent: string;
}

/** Message API uses ZOHO_SMTP_USER server-side; sender.email in body is rejected. */
export interface HttpApiSendPayload {
  sender: { name: string };
  to: Array<{ email: string }>;
  subject: string;
  htmlContent: string;
  textContent: string;
}

export function toBrevoStylePayload(
  options: EmailSendOptions,
  sender: BrevoStyleSender,
): BrevoStyleSendPayload {
  return {
    sender,
    to: [{ email: options.to }],
    subject: options.subject,
    htmlContent: options.html,
    textContent: options.text,
  };
}

export function toHttpApiPayload(
  options: EmailSendOptions,
  sender: BrevoStyleSender,
): HttpApiSendPayload {
  return {
    sender: { name: sender.name },
    to: [{ email: options.to }],
    subject: options.subject,
    htmlContent: options.html,
    textContent: options.text,
  };
}

export async function postBrevoStyleEmail(options: {
  url: string;
  apiKey: string;
  payload: BrevoStyleSendPayload | HttpApiSendPayload;
  providerLabel: string;
}): Promise<void> {
  const response = await fetch(options.url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": options.apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(options.payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `${options.providerLabel} error (${response.status})${body ? `: ${body}` : ""}`,
    );
  }
}
