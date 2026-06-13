import type { Channel, ConsumeMessage } from "amqplib";
import { isEmailConfigured } from "@/lib/email/config";
import { sendMail } from "@/lib/email/transport";
import { EMAIL_QUEUE_NAME, isQueueConfigured } from "@/server/queue/config";
import { getQueueChannel } from "@/server/queue/connection";
import { parseEmailJob } from "@/server/queue/jobs";

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
