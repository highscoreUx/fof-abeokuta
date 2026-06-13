import { isEmailConfigured } from "@/lib/email/config";
import { EMAIL_QUEUE_NAME, isQueueConfigured } from "@/server/queue/config";
import { getQueueChannel } from "@/server/queue/connection";
import { CHECK_IN_WELCOME_JOB, type CheckInWelcomeEmailJob } from "@/server/queue/jobs";

export function canSendCheckInEmails(): boolean {
  return isQueueConfigured() && isEmailConfigured();
}

export async function publishCheckInWelcomeEmailJob(
  payload: Omit<CheckInWelcomeEmailJob, "type">,
): Promise<void> {
  if (!canSendCheckInEmails()) return;

  const channel = await getQueueChannel();
  const job: CheckInWelcomeEmailJob = {
    type: CHECK_IN_WELCOME_JOB,
    userId: payload.userId,
    eventId: payload.eventId,
  };

  channel.sendToQueue(EMAIL_QUEUE_NAME, Buffer.from(JSON.stringify(job)), {
    persistent: true,
    contentType: "application/json",
  });
}

export function enqueueCheckInWelcomeEmail(payload: {
  userId: string;
  eventId: string;
}): void {
  if (!canSendCheckInEmails()) return;

  void publishCheckInWelcomeEmailJob(payload).catch((error) => {
    console.error("[queue] Failed to enqueue check-in welcome email:", error);
  });
}
