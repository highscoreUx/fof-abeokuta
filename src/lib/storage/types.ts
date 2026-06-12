export interface UploadOptions {
  folder: string;
  filename?: string;
  mimeType: string;
  resourceType?: "image" | "video" | "raw" | "auto";
}

export interface StoredAsset {
  key: string;
  provider: string;
  providerId?: string;
  mimeType: string;
  url: string;
  width?: number;
  height?: number;
}

export interface StorageAdapter {
  upload(buffer: Buffer, options: UploadOptions): Promise<StoredAsset>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
