"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEventApi } from "@/hooks/useEventApi";
import { toastError } from "@/lib/toast";
import type { EventPhotoLibraryRow } from "@/types/gallery";

export function GallerySettings() {
  const { api } = useEventApi();
  const [library, setLibrary] = useState<EventPhotoLibraryRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api<{ library: EventPhotoLibraryRow }>("/gallery/library");
        setLibrary(data.library);
      } catch (error) {
        toastError("Failed to load gallery settings", error instanceof Error ? error.message : undefined);
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const albumUrl = library?.officialGalleryUrl;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Gallery</CardTitle>
          <CardDescription>
            Each event gets a Google Photos album when it is created. Uploads from the in-app gallery
            are stored there automatically. Quiz and other media still use Cloudinary/R2.
          </CardDescription>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading gallery…</p>
        ) : !library?.googleAlbumId ? (
          <p className="text-sm text-muted-foreground">
            Google Photos is not configured for this event yet. Set up Google Photos credentials in
            the server environment to enable gallery storage.
          </p>
        ) : albumUrl ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Google Photos album for this event:
            </p>
            <a
              href={albumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 max-w-full items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <ArrowSquareOut size={18} className="mr-2 shrink-0" aria-hidden />
              <span className="truncate">{albumUrl}</span>
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Album created (ID: {library.googleAlbumId}). The Google Photos link will appear here once
            it is available from Google.
          </p>
        )}
      </CardHeader>
    </Card>
  );
}
