import type { Channel, ConsumeMessage } from "amqplib";
import {
  EMAIL_QUEUE_NAME,
  getEmailPrefetchCount,
  getEmailProvider,
  isEmailConfigured,
  isQueueConfigured,
} from "@/server/email-worker/config";
import { getQueueChannel } from "@/server/email-worker/connection";
import { parseEmailJob } from "@/server/email-worker/jobs";
import { sendMail } from "@/server/email-worker/transport";

async function handleMessage(message: ConsumeMessage, channel: Channel): Promise<void> {
  const job = parseEmailJob(message.content);
  if (!job) {
    console.warn("[queue] Dropping invalid send_email job payload");
    channel.ack(message);
    return;
  }

  try {
    await sendMail({
      to: job.to,
      subject: job.subject,
      html: job.html,
      text: job.text,
    });
    const kind = job.meta?.kind ?? "email";
    console.info(`[email] Sent ${kind} to ${job.to} (${job.messageId})`);
    channel.ack(message);
  } catch (error) {
    console.error(`[queue] Failed to send email ${job.messageId}:`, error);
    channel.nack(message, false, false);
  }
}

export async function startEmailQueueConsumer(): Promise<void> {
  if (!isQueueConfigured()) {
    console.info("[queue] CLOUDAMQP_URL not set — email queue consumer disabled");
    return;
  }
  if (!isEmailConfigured()) {
    console.info("[queue] Email transport not configured — email queue consumer disabled");
    return;
  }

  const provider = getEmailProvider();
  const prefetch = getEmailPrefetchCount(provider);

  const channel = await getQueueChannel();
  await channel.prefetch(prefetch);

  await channel.consume(
    EMAIL_QUEUE_NAME,
    (message) => {
      if (!message) return;
      void handleMessage(message, channel);
    },
    { noAck: false },
  );

  console.info(
    `[queue] Email consumer listening on "${EMAIL_QUEUE_NAME}" (${provider ?? "unknown"} transport, prefetch ${prefetch})`,
  );
}
