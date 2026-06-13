import { getBrevoConfig } from "@/server/email-worker/config";
import {
  postBrevoStyleEmail,
  toBrevoStylePayload,
} from "@/server/email-worker/adapters/brevo-style-api";
import type { EmailSendOptions, EmailTransportAdapter } from "@/server/email-worker/adapters/types";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

export function createBrevoTransport(): EmailTransportAdapter {
  return {
    name: "brevo",
    async send(options: EmailSendOptions) {
      const { apiKey, sender } = getBrevoConfig();

      await postBrevoStyleEmail({
        url: BREVO_SEND_URL,
        apiKey,
        payload: toBrevoStylePayload(options, sender),
        providerLabel: "Brevo API",
      });
    },
  };
}
