"use client";

import { useEffect, useRef, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { DEFAULT_LOGIN_SLIDE_PATHS, resolveLoginSlides } from "@/lib/login-slides";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/lib/toast";

export function LoginSlideAdmin() {
  const { slug, api } = useEventApi();
  const [slides, setSlides] = useState<string[]>(resolveLoginSlides([...DEFAULT_LOGIN_SLIDE_PATHS]));
  const [custom, setCustom] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    api<{ slides: string[]; custom: boolean }>("/settings/login-slides").then((data) => {
      setSlides(resolveLoginSlides(data.slides));
      setCustom(data.custom);
    });
  }, [slug]);

  const upload = async (index: number, file: File) => {
    setUploading(index);
    try {
      const form = new FormData();
      form.append("index", String(index));
      form.append("file", file);

      const response = await fetch(`/api/events/${slug}/settings/login-slides`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");

      setSlides(resolveLoginSlides(data.slides));
      setCustom(true);
      toastSuccess("Login slides updated");
    } catch (err) {
      toastError("Upload failed", err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(null);
    }
  };

  const reset = async () => {
    try {
      const data = await api<{ slides: string[]; custom: boolean }>("/settings/login-slides", {
        method: "DELETE",
      });
      setSlides(resolveLoginSlides(data.slides));
      setCustom(data.custom);
      toastSuccess("Reset to default slides");
    } catch (err) {
      toastError("Reset failed", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login page slides</CardTitle>
        <CardDescription>
          Images shown on the left of your event sign-in page. Leave unset to use the default FOF photos.
        </CardDescription>
      </CardHeader>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {slides.map((src, index) => (
          <div key={index} className="space-y-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Login slide ${index + 1}`} className="h-full w-full object-cover" />
            </div>
            <input
              ref={fileRefs[index]}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(index, file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading === index}
              onClick={() => fileRefs[index].current?.click()}
            >
              {uploading === index ? "Uploading..." : `Replace slide ${index + 1}`}
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => void reset()} disabled={!custom}>
          Reset to defaults
        </Button>
        {custom && <span className="text-xs text-muted-foreground">Using custom slides</span>}
      </div>
    </Card>
  );
}
