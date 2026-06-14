import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getGalleryStagingDir } from "@/server/gallery-worker/config";

function stagingRoot(): string {
  return path.isAbsolute(getGalleryStagingDir())
    ? getGalleryStagingDir()
    : path.join(process.cwd(), getGalleryStagingDir());
}

function stagingPath(photoId: string): string {
  return path.join(stagingRoot(), photoId);
}

export async function saveGalleryStagingFile(photoId: string, buffer: Buffer): Promise<void> {
  await mkdir(stagingRoot(), { recursive: true });
  await writeFile(stagingPath(photoId), buffer);
}

export async function readGalleryStagingFile(photoId: string): Promise<Buffer | null> {
  try {
    return await readFile(stagingPath(photoId));
  } catch {
    return null;
  }
}

export async function deleteGalleryStagingFile(photoId: string): Promise<void> {
  try {
    await rm(stagingPath(photoId), { force: true });
  } catch {
    // ignore
  }
}
