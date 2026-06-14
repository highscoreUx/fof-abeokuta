import { getQueueChannel } from "@/server/email-worker/connection";
import {
  GALLERY_QUEUE_NAME,
  isGalleryQueueConfigured,
} from "@/server/gallery-worker/config";
import {
  PROCESS_GALLERY_UPLOAD_JOB,
  type ProcessGalleryUploadJob,
} from "@/server/gallery-worker/jobs";
import { processGalleryUpload } from "@/server/gallery-worker/processor";

export function canEnqueueGalleryUploads(): boolean {
  return isGalleryQueueConfigured();
}

async function assertGalleryQueue() {
  const channel = await getQueueChannel();
  await channel.assertQueue(GALLERY_QUEUE_NAME, { durable: true });
  return channel;
}

async function publishGalleryJob(photoId: string): Promise<void> {
  const channel = await assertGalleryQueue();
  const job: ProcessGalleryUploadJob = {
    type: PROCESS_GALLERY_UPLOAD_JOB,
    photoId,
  };
  channel.sendToQueue(GALLERY_QUEUE_NAME, Buffer.from(JSON.stringify(job)), {
    persistent: true,
    contentType: "application/json",
  });
}

export async function enqueueGalleryUpload(photoId: string): Promise<void> {
  if (!canEnqueueGalleryUploads()) {
    await processGalleryUpload(photoId);
    return;
  }
  await publishGalleryJob(photoId);
}

export function enqueueGalleryUploadFireAndForget(photoId: string): void {
  void enqueueGalleryUpload(photoId).catch((error) => {
    console.error(`[gallery] Failed to enqueue upload ${photoId}:`, error);
  });
}
