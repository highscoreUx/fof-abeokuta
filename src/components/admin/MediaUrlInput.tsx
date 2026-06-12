"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MediaUrlInputProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  uploading?: boolean;
  previewType?: "image" | "audio";
}

export function MediaUrlInput({
  label,
  value,
  onChange,
  onUpload,
  accept = "image/*",
  uploading = false,
  previewType = "image",
}: MediaUrlInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      {label ? (
        <span className="block text-xs text-muted-foreground">{label}</span>
      ) : null}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
        disabled={uploading}
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">or</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Upload file"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const url = await onUpload(file);
              onChange(url);
            } finally {
              e.target.value = "";
            }
          }}
        />
      </div>
      {value && previewType === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="max-h-32 rounded-lg border border-border object-contain"
        />
      )}
      {value && previewType === "audio" && (
        <audio controls src={value} className="w-full" />
      )}
    </div>
  );
}
