"use client";

import { useRef } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { GALLERY_FILE_ACCEPT } from "@/lib/gallery-media";
import { useGalleryUploadMutation } from "@/hooks/useGalleryQuery";
import { useHasAnyPermission, useHasPermission } from "@/hooks/useHasPermission";
import { toastError, toastSuccess } from "@/lib/toast";

interface GalleryUploadControlsProps {
  className?: string;
  variant?: "button" | "fab";
}

export function GalleryUploadControls({
  className,
  variant = "button",
}: GalleryUploadControlsProps) {
  const forceOfficial = useHasPermission("gallery.official_upload");
  const canUpload = useHasAnyPermission([
    "gallery.upload",
    "gallery.media_upload",
    "gallery.official_upload",
  ]);
  const uploadMutation = useGalleryUploadMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!canUpload) return null;

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    try {
      await uploadMutation.mutateAsync({
        files,
        isOfficial: forceOfficial,
      });
      toastSuccess(
        files.length === 1
          ? forceOfficial
            ? "Official media queued for upload"
            : "Media queued for upload"
          : forceOfficial
            ? `${files.length} official items queued for upload`
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
      {variant === "fab" ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          aria-label={forceOfficial ? "Upload official media" : "Upload media"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95 disabled:opacity-60"
        >
          <Plus size={22} weight="bold" aria-hidden />
        </button>
      ) : (
        <Button
          className={className ?? "shrink-0"}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending
            ? "Queuing…"
            : forceOfficial
              ? "Upload official media"
              : "Upload media"}
        </Button>
      )}
    </>
  );
}
