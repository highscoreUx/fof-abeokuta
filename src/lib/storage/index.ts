import { createCloudinaryAdapter } from "@/lib/storage/cloudinary";
import { createR2Adapter } from "@/lib/storage/r2";
import type { StorageAdapter } from "@/lib/storage/types";

let adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (adapter) return adapter;

  const provider = (process.env.STORAGE_PROVIDER ?? "cloudinary").toLowerCase();

  if (provider === "r2") {
    adapter = createR2Adapter();
  } else if (provider === "cloudinary") {
    adapter = createCloudinaryAdapter();
  } else {
    throw new Error(`Unknown STORAGE_PROVIDER: ${provider}`);
  }

  return adapter;
}

export function resolveMediaUrl(key: string | null | undefined, fallbackUrl?: string | null) {
  if (fallbackUrl) return fallbackUrl;
  if (!key) return null;
  try {
    return getStorageAdapter().getPublicUrl(key);
  } catch {
    return null;
  }
}

export type { StorageAdapter, StoredAsset, UploadOptions } from "@/lib/storage/types";
