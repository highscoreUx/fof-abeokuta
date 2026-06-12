import type { StorageAdapter, StoredAsset, UploadOptions } from "@/lib/storage/types";

export function createCloudinaryAdapter(): StorageAdapter {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are not configured");
  }

  return {
    async upload(buffer: Buffer, options: UploadOptions): Promise<StoredAsset> {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = options.folder;
      const publicId = options.filename ?? `asset-${timestamp}`;

      const crypto = await import("crypto");
      const params: Record<string, string> = {
        folder,
        public_id: publicId,
        timestamp: String(timestamp),
      };
      const toSign = `${Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&")}${apiSecret}`;
      const signature = crypto.createHash("sha1").update(toSign).digest("hex");

      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(buffer)], { type: options.mimeType }));
      form.append("api_key", apiKey);
      form.append("timestamp", String(timestamp));
      form.append("signature", signature);
      form.append("folder", folder);
      form.append("public_id", publicId);
      if (options.resourceType) {
        form.append("resource_type", options.resourceType);
      }

      const resourceType = options.resourceType === "raw" ? "raw" : "auto";
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        { method: "POST", body: form },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Cloudinary upload failed: ${body}`);
      }

      const data = (await response.json()) as {
        public_id: string;
        secure_url: string;
        width?: number;
        height?: number;
        resource_type: string;
      };

      return {
        key: data.public_id,
        provider: "cloudinary",
        providerId: data.public_id,
        mimeType: options.mimeType,
        url: data.secure_url,
        width: data.width,
        height: data.height,
      };
    },

    async delete(key: string): Promise<void> {
      const timestamp = Math.floor(Date.now() / 1000);
      const crypto = await import("crypto");
      const signature = crypto
        .createHash("sha1")
        .update(`public_id=${key}&timestamp=${timestamp}${apiSecret}`)
        .digest("hex");

      const body = new URLSearchParams({
        public_id: key,
        api_key: apiKey,
        timestamp: String(timestamp),
        signature,
      });

      await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: "POST",
        body,
      });
    },

    getPublicUrl(key: string): string {
      return `https://res.cloudinary.com/${cloudName}/image/upload/${key}`;
    },
  };
}
