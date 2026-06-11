"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useEventApi } from "@/hooks/useEventApi";
import { DEFAULT_LOGIN_SLIDE_PATHS, resolveLoginSlides } from "@/lib/login-slides";
import type { LoginSlideSource } from "@/lib/login-slides";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

export function LoginSlideAdmin() {
  const { slug, api } = useEventApi();
  const [slides, setSlides] = useState<LoginSlideSource[]>(resolveLoginSlides([...DEFAULT_LOGIN_SLIDE_PATHS]));
  const [custom, setCustom] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    api<{ slides: string[]; custom: boolean }>("/settings/login-slides").then((data) => {
      setSlides(resolveLoginSlides(data.slides));
      setCustom(data.custom);
    });
  }, [slug]);

  const upload = async (index: number, file: File) => {
    setUploading(index);
    setMessage("");
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
      setMessage("Login slides updated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const reset = async () => {
    setMessage("");
    try {
      const data = await api<{ slides: string[]; custom: boolean }>("/settings/login-slides", {
        method: "DELETE",
      });
      setSlides(resolveLoginSlides(data.slides));
      setCustom(data.custom);
      setMessage("Reset to default slides.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Reset failed");
    }
  };

  return (
    <Card>
      <CardTitle>Login Page Slides</CardTitle>
      <p className="mt-2 text-sm text-muted-foreground">
        Images shown on the left of your event login page. Leave unset to use the default FOF photos.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {slides.map((src, index) => (
          <div key={index} className="space-y-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
              <Image src={src} alt={`Login slide ${index + 1}`} fill className="object-cover" sizes="200px" />
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
              variant="secondary"
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
      {message && <p className="mt-2 text-sm text-muted-foreground">{message}</p>}
    </Card>
  );
}
