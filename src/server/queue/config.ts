export const EMAIL_QUEUE_NAME = "fof.email";

export function isQueueConfigured(): boolean {
  return Boolean(process.env.CLOUDAMQP_URL?.trim());
}

export function getCloudAmqpUrl(): string {
  const url = process.env.CLOUDAMQP_URL?.trim();
  if (!url) {
    throw new Error("CLOUDAMQP_URL is not configured");
  }
  return url;
}
