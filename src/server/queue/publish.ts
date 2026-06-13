import { isEmailConfigured } from "@/lib/email/config";
import { EMAIL_QUEUE_NAME, isQueueConfigured } from "@/server/queue/config";
import { getQueueChannel } from "@/server/queue/connection";
import {
  ACCOUNT_CREDENTIALS_JOB,
  CHECK_IN_WELCOME_JOB,
  type AccountCredentialsEmailJob,
  type CheckInWelcomeEmailJob,
} from "@/server/queue/jobs";

export function canSendQueuedEmails(): boolean {
  return isQueueConfigured() && isEmailConfigured();
}

async function publishEmailJob(job: CheckInWelcomeEmailJob | AccountCredentialsEmailJob): Promise<void> {
  const channel = await getQueueChannel();
  channel.sendToQueue(EMAIL_QUEUE_NAME, Buffer.from(JSON.stringify(job)), {
    persistent: true,
    contentType: "application/json",
  });
}

export async function publishCheckInWelcomeEmailJob(
  payload: Omit<CheckInWelcomeEmailJob, "type">,
): Promise<void> {
  if (!canSendQueuedEmails()) return;
  await publishEmailJob({
    type: CHECK_IN_WELCOME_JOB,
    userId: payload.userId,
    eventId: payload.eventId,
  });
}

export async function publishAccountCredentialsEmailJob(
  payload: Omit<AccountCredentialsEmailJob, "type">,
): Promise<void> {
  if (!canSendQueuedEmails()) return;
  await publishEmailJob({
    type: ACCOUNT_CREDENTIALS_JOB,
    ...payload,
  });
}

export function enqueueCheckInWelcomeEmail(payload: {
  userId: string;
  eventId: string;
}): void {
  if (!canSendQueuedEmails()) return;
  void publishCheckInWelcomeEmailJob(payload).catch((error) => {
    console.error("[queue] Failed to enqueue check-in welcome email:", error);
  });
}

export function enqueueAccountCredentialsEmail(payload: {
  accountId: string;
  password: string;
  reason: AccountCredentialsEmailJob["reason"];
  loginPath?: string;
}): void {
  if (!canSendQueuedEmails()) return;
  void publishAccountCredentialsEmailJob(payload).catch((error) => {
    console.error("[queue] Failed to enqueue account credentials email:", error);
  });
}

/** @deprecated use canSendQueuedEmails */
export const canSendCheckInEmails = canSendQueuedEmails;
