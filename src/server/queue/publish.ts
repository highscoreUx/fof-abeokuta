import { randomUUID } from "node:crypto";
import type { PreparedEmail } from "@/lib/email/prepared-email";
import { prepareForgotPasswordEmail } from "@/lib/email/prepare-forgot-password-email";
import { prepareAccountCredentialsEmail } from "@/lib/email/prepare-account-credentials-email";
import { prepareCheckInWelcomeEmail } from "@/lib/email/prepare-check-in-welcome-email";
import {
  EMAIL_QUEUE_NAME,
  isQueueConfigured,
} from "@/server/email-worker/config";
import { getQueueChannel } from "@/server/email-worker/connection";
import { SEND_EMAIL_JOB, type SendEmailJob } from "@/server/email-worker/jobs";

export function canEnqueueEmails(): boolean {
  return isQueueConfigured();
}

/** @deprecated use canEnqueueEmails */
export const canSendQueuedEmails = canEnqueueEmails;

/** @deprecated use canEnqueueEmails */
export const canSendCheckInEmails = canEnqueueEmails;

function toSendEmailJob(prepared: PreparedEmail): SendEmailJob {
  return {
    type: SEND_EMAIL_JOB,
    messageId: randomUUID(),
    to: prepared.to,
    subject: prepared.subject,
    html: prepared.html,
    text: prepared.text,
    meta: prepared.meta
      ? { kind: prepared.meta.kind, reason: prepared.meta.reason }
      : undefined,
  };
}

async function publishSendEmailJob(prepared: PreparedEmail): Promise<void> {
  const channel = await getQueueChannel();
  const job = toSendEmailJob(prepared);
  channel.sendToQueue(EMAIL_QUEUE_NAME, Buffer.from(JSON.stringify(job)), {
    persistent: true,
    contentType: "application/json",
  });
}

export async function enqueuePreparedEmail(prepared: PreparedEmail): Promise<void> {
  if (!canEnqueueEmails()) return;
  await publishSendEmailJob(prepared);
}

export function enqueuePreparedEmailFireAndForget(prepared: PreparedEmail): void {
  if (!canEnqueueEmails()) return;
  void enqueuePreparedEmail(prepared).catch((error) => {
    console.error("[queue] Failed to enqueue send_email job:", error);
  });
}

export function enqueueCheckInWelcomeEmail(payload: {
  userId: string;
  eventId: string;
}): void {
  if (!canEnqueueEmails()) return;
  void prepareCheckInWelcomeEmail(payload.userId, payload.eventId)
    .then((prepared) => {
      if (!prepared) return;
      return enqueuePreparedEmail(prepared);
    })
    .catch((error) => {
      console.error("[queue] Failed to prepare check-in welcome email:", error);
    });
}

export function enqueueForgotPasswordEmail(payload: {
  accountId: string;
  rawToken: string;
}): void {
  if (!canEnqueueEmails()) return;
  void prepareForgotPasswordEmail(payload.accountId, payload.rawToken)
    .then((prepared) => {
      if (!prepared) return;
      return enqueuePreparedEmail(prepared);
    })
    .catch((error) => {
      console.error("[queue] Failed to prepare forgot-password email:", error);
    });
}

export function enqueueAccountCredentialsEmail(payload: {
  accountId: string;
  password: string;
  reason: "welcome" | "reset" | "check_in";
  loginPath?: string;
}): void {
  if (!canEnqueueEmails()) return;
  void prepareAccountCredentialsEmail(payload.accountId, payload.password, {
    reason: payload.reason,
    loginPath: payload.loginPath,
  })
    .then((prepared) => {
      if (!prepared) return;
      return enqueuePreparedEmail(prepared);
    })
    .catch((error) => {
      console.error("[queue] Failed to prepare account credentials email:", error);
    });
}
