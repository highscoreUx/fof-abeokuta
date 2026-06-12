import type { StorageAdapter, StoredAsset, UploadOptions } from "@/lib/storage/types";

export function createR2Adapter(): StorageAdapter {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error("R2 credentials are not configured");
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  return {
    async upload(buffer: Buffer, options: UploadOptions): Promise<StoredAsset> {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const key = `${options.folder}/${options.filename ?? `asset-${Date.now()}`}`;

      const client = new S3Client({
        region: "auto",
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: options.mimeType,
        }),
      );

      return {
        key,
        provider: "r2",
        mimeType: options.mimeType,
        url: `${publicUrl}/${key}`,
      };
    },

    async delete(key: string): Promise<void> {
      const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: "auto",
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    getPublicUrl(key: string): string {
      return `${publicUrl}/${key}`;
    },
  };
}
