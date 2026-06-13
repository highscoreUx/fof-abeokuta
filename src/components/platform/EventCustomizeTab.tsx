"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_LOGIN_SLIDE_PATHS, resolveLoginSlides } from "@/lib/login-slides";
import { platformApiFetch, platformApiUpload } from "@/lib/platform-api-client";
import { toastError, toastSuccess } from "@/lib/toast";

interface EventCustomizeTabProps {
  eventSlug: string;
}

export function EventCustomizeTab({ eventSlug }: EventCustomizeTabProps) {
  const [slides, setSlides] = useState<string[]>(resolveLoginSlides([...DEFAULT_LOGIN_SLIDE_PATHS]));
  const [custom, setCustom] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const slidesPath = `/api/events/${eventSlug}/settings/login-slides`;

  useEffect(() => {
    platformApiFetch<{ slides: string[]; custom: boolean }>(slidesPath)
      .then((data) => {
        setSlides(resolveLoginSlides(data.slides));
        setCustom(data.custom);
      })
      .catch(() => {
        setSlides(resolveLoginSlides([...DEFAULT_LOGIN_SLIDE_PATHS]));
        setCustom(false);
      });
  }, [eventSlug]);

  const upload = async (index: number, file: File) => {
    setUploading(index);
    try {
      const form = new FormData();
      form.append("index", String(index));
      form.append("file", file);
      const data = await platformApiUpload<{ slides: string[] }>(slidesPath, form);
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
      const data = await platformApiFetch<{ slides: string[]; custom: boolean }>(slidesPath, {
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
    <Card className="p-0 shadow-none">
      <CardHeader className="border-b border-border p-6">
        <CardTitle>Customize</CardTitle>
        <CardDescription>
          Branding for this event — landing page layout and sign-in slideshow.
        </CardDescription>
      </CardHeader>
      <div className="space-y-8 p-6">
        <section>
          <h3 className="text-sm font-semibold">Landing page</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Build the public page at{" "}
            <span className="font-mono text-foreground">/{eventSlug}</span>. Visitors see the
            published page; you can edit blocks, hero, and CTAs in the visual editor.
          </p>
          <Link
            href={`/${eventSlug}?edit=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary-hover"
          >
            Customize landing page
          </Link>
        </section>

        <section className="border-t border-border pt-8">
        <h3 className="text-sm font-semibold">Login page slides</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Images on the left of the event sign-in page. Leave unset to use the default FOF photos.
        </p>
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
                {uploading === index ? "Uploading…" : `Replace slide ${index + 1}`}
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
        </section>
      </div>
    </Card>
  );
}
