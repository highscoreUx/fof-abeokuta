import type { SendEmailMeta } from "@/lib/email/prepared-email";

export const SEND_EMAIL_JOB = "send_email" as const;

export interface SendEmailJob {
  type: typeof SEND_EMAIL_JOB;
  messageId: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  meta?: SendEmailMeta;
}

export type EmailJob = SendEmailJob;

export function parseEmailJob(raw: Buffer): SendEmailJob | null {
  try {
    const parsed = JSON.parse(raw.toString("utf8")) as SendEmailJob;
    if (parsed?.type !== SEND_EMAIL_JOB) return null;
    if (typeof parsed.messageId !== "string" || !parsed.messageId.trim()) return null;
    if (typeof parsed.to !== "string" || !parsed.to.trim()) return null;
    if (typeof parsed.subject !== "string") return null;
    if (typeof parsed.html !== "string") return null;
    if (typeof parsed.text !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
