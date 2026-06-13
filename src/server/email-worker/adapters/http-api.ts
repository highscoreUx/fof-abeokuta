import { getHttpApiConfig } from "@/server/email-worker/config";
import {
  postBrevoStyleEmail,
  toHttpApiPayload,
} from "@/server/email-worker/adapters/brevo-style-api";
import type { EmailSendOptions, EmailTransportAdapter } from "@/server/email-worker/adapters/types";

/** Custom HTTPS server using the same request shape as Brevo transactional email API. */
export function createHttpApiTransport(): EmailTransportAdapter {
  return {
    name: "http",
    async send(options: EmailSendOptions) {
      const { apiUrl, apiKey, sender } = getHttpApiConfig();

      await postBrevoStyleEmail({
        url: apiUrl,
        apiKey,
        payload: toHttpApiPayload(options, sender),
        providerLabel: "Email HTTP API",
      });
    },
  };
}
