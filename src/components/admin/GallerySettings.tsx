"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEventApi } from "@/hooks/useEventApi";
import { toastError, toastSuccess } from "@/lib/toast";
import type { EventPhotoLibraryRow } from "@/types/gallery";

export function GallerySettings() {
  const { api } = useEventApi();
  const [library, setLibrary] = useState<EventPhotoLibraryRow | null>(null);
  const [officialGalleryUrl, setOfficialGalleryUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api<{ library: EventPhotoLibraryRow }>("/gallery/library");
        setLibrary(data.library);
        setOfficialGalleryUrl(data.library.officialGalleryUrl ?? "");
      } catch (error) {
        toastError("Failed to load gallery settings", error instanceof Error ? error.message : undefined);
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const save = async () => {
    setSaving(true);
    try {
      const data = await api<{ library: EventPhotoLibraryRow }>("/gallery/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officialGalleryUrl: officialGalleryUrl.trim() || null,
        }),
      });
      setLibrary(data.library);
      setOfficialGalleryUrl(data.library.officialGalleryUrl ?? "");
      toastSuccess("Gallery settings saved");
    } catch (error) {
      toastError("Failed to save gallery settings", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Gallery</CardTitle>
          <CardDescription>
            Each event gets a Google Photos album when it is created. Uploads from the in-app gallery
            are stored there automatically. After sharing the album in Google Photos (Share → Create
            link), paste the public URL here so participants can open it from the Official filter.
          </CardDescription>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading gallery…</p>
        ) : !library?.googleAlbumId ? (
          <p className="text-sm text-muted-foreground">
            Google Photos is not configured for this event yet. Set up Google Photos credentials in
            the server environment to enable gallery storage.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="official-gallery-url">Public album link</Label>
              <Input
                id="official-gallery-url"
                type="url"
                placeholder="https://photos.app.goo.gl/..."
                value={officialGalleryUrl}
                onChange={(event) => setOfficialGalleryUrl(event.target.value)}
                disabled={loading}
              />
            </div>

            {library.officialGalleryUrl && (
              <a
                href={library.officialGalleryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 max-w-full items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                <ArrowSquareOut size={18} className="mr-2 shrink-0" aria-hidden />
                <span className="truncate">{library.officialGalleryUrl}</span>
              </a>
            )}

            <Button onClick={() => void save()} disabled={loading || saving}>
              {saving ? "Saving…" : "Save gallery settings"}
            </Button>
          </div>
        )}
      </CardHeader>
    </Card>
  );
}
