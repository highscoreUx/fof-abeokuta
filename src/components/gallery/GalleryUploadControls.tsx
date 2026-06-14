"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { GALLERY_FILE_ACCEPT } from "@/lib/gallery-media";
import { useGalleryUploadMutation } from "@/hooks/useGalleryQuery";
import { useHasAnyPermission } from "@/hooks/useHasPermission";
import { toastError, toastSuccess } from "@/lib/toast";

interface GalleryUploadControlsProps {
  className?: string;
}

export function GalleryUploadControls({ className }: GalleryUploadControlsProps) {
  const canUpload = useHasAnyPermission(["gallery.upload", "gallery.media_upload"]);
  const uploadMutation = useGalleryUploadMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!canUpload) return null;

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    try {
      await uploadMutation.mutateAsync({ files, isOfficial: false });
      toastSuccess(
        files.length === 1
          ? "Media queued for upload"
          : `${files.length} items queued for upload`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toastError("Upload failed", error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={GALLERY_FILE_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => void handleUpload(event.target.files)}
      />
      <Button
        className={className ?? "shrink-0"}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadMutation.isPending}
      >
        {uploadMutation.isPending ? "Queuing…" : "Upload media"}
      </Button>
    </>
  );
}
