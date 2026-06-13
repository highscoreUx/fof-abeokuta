import type { Channel, ConsumeMessage } from "amqplib";
import { isEmailConfigured } from "@/lib/email/config";
import { sendAccountCredentialsEmail } from "@/lib/email/send-account-credentials-email";
import { sendCheckInWelcomeEmail } from "@/lib/email/send-check-in-email";
import { EMAIL_QUEUE_NAME, isQueueConfigured } from "@/server/queue/config";
import { getQueueChannel } from "@/server/queue/connection";
import {
  ACCOUNT_CREDENTIALS_JOB,
  CHECK_IN_WELCOME_JOB,
  parseEmailJob,
} from "@/server/queue/jobs";

async function handleMessage(message: ConsumeMessage, channel: Channel): Promise<void> {
  const job = parseEmailJob(message.content);
  if (!job) {
    console.warn("[queue] Dropping invalid email job payload");
    channel.ack(message);
    return;
  }

  try {
    if (job.type === CHECK_IN_WELCOME_JOB) {
      await sendCheckInWelcomeEmail(job.userId, job.eventId);
    } else if (job.type === ACCOUNT_CREDENTIALS_JOB) {
      await sendAccountCredentialsEmail(job.accountId, job.password, {
        reason: job.reason,
        loginPath: job.loginPath,
      });
    }
    channel.ack(message);
  } catch (error) {
    console.error("[queue] Failed to process email job:", error);
    channel.nack(message, false, false);
  }
}

export async function startEmailQueueConsumer(): Promise<void> {
  if (!isQueueConfigured()) {
    console.info("[queue] CLOUDAMQP_URL not set — email queue consumer disabled");
    return;
  }
  if (!isEmailConfigured()) {
    console.info("[queue] SMTP not configured — email queue consumer disabled");
    return;
  }

  const channel = await getQueueChannel();
  await channel.prefetch(1);

  await channel.consume(
    EMAIL_QUEUE_NAME,
    (message) => {
      if (!message) return;
      void handleMessage(message, channel);
    },
    { noAck: false },
  );

  console.info(`[queue] Email consumer listening on "${EMAIL_QUEUE_NAME}"`);
}
