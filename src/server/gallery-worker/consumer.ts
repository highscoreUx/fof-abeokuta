import type { Channel, ConsumeMessage } from "amqplib";
import { getQueueChannel } from "@/server/email-worker/connection";
import {
  GALLERY_PREFETCH,
  GALLERY_QUEUE_NAME,
  isGalleryQueueConfigured,
} from "@/server/gallery-worker/config";
import { parseGalleryJob } from "@/server/gallery-worker/jobs";
import { processGalleryUpload } from "@/server/gallery-worker/processor";

async function handleMessage(message: ConsumeMessage, channel: Channel): Promise<void> {
  const job = parseGalleryJob(message.content);
  if (!job) {
    console.warn("[gallery] Dropping invalid gallery job payload");
    channel.ack(message);
    return;
  }

  try {
    await processGalleryUpload(job.photoId);
    channel.ack(message);
  } catch (error) {
    console.error(`[gallery] Failed to process upload ${job.photoId}:`, error);
    channel.nack(message, false, false);
  }
}

export async function startGalleryQueueConsumer(): Promise<void> {
  if (!isGalleryQueueConfigured()) {
    console.info("[gallery] CLOUDAMQP_URL not set — gallery queue consumer disabled");
    return;
  }

  const channel = await getQueueChannel();
  await channel.assertQueue(GALLERY_QUEUE_NAME, { durable: true });
  await channel.prefetch(GALLERY_PREFETCH);

  await channel.consume(
    GALLERY_QUEUE_NAME,
    (message) => {
      if (!message) return;
      void handleMessage(message, channel);
    },
    { noAck: false },
  );

  console.info(
    `[gallery] Consumer listening on "${GALLERY_QUEUE_NAME}" (prefetch ${GALLERY_PREFETCH})`,
  );
}
