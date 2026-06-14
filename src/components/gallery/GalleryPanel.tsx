"use client";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useGalleryDeleteMutation, useGalleryQuery } from "@/hooks/useGalleryQuery";
import { useHasPermission } from "@/hooks/useHasPermission";
import { isGalleryVideoMime } from "@/lib/gallery-media";
import type { GalleryFilter, GalleryPhotoRow } from "@/types/gallery";
import { cn } from "@/lib/cn";

interface GalleryPanelProps {
  filter: GalleryFilter;
  team?: string;
}

export function GalleryPanel({ filter, team }: GalleryPanelProps) {
  const { user } = useAuth();
  const canManage = useHasPermission("gallery.manage");

  const { data, isLoading, isFetching } = useGalleryQuery({
    filter: filter === "team" ? "team" : filter,
    team: filter === "team" ? team : undefined,
    pollPending: true,
  });

  const deleteMutation = useGalleryDeleteMutation();

  const albumUrl = data?.library.officialGalleryUrl;
  const showOfficialLink = filter === "official" && albumUrl;

  return (
    <div className="w-full space-y-6">
      {showOfficialLink && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Official album</CardTitle>
            <CardDescription>
              Curated media lives in Google Photos. Open the album to view branded official shots.
            </CardDescription>
            <div>
              <a
                href={albumUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                View official album
              </a>
            </div>
          </CardHeader>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading gallery…</p>
      ) : (
        <>
          {isFetching && <p className="text-xs text-muted-foreground">Refreshing…</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data?.data.map((photo: GalleryPhotoRow) => (
              <figure
                key={photo.id}
                className={cn(
                  "group overflow-hidden rounded-xl border border-border bg-card",
                  photo.status !== "READY" && "opacity-80",
                )}
              >
                <div className="relative aspect-square bg-muted">
                  {photo.status === "READY" &&
                  isGalleryVideoMime(photo.mimeType) &&
                  photo.url ? (
                    <video
                      src={photo.url}
                      poster={photo.thumbnailUrl ?? undefined}
                      controls
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : photo.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.thumbnailUrl}
                      alt={photo.caption ?? photo.originalFilename ?? "Gallery media"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                      {photo.status === "FAILED"
                        ? (photo.errorMessage ?? "Upload failed")
                        : "Processing…"}
                    </div>
                  )}
                </div>
                <figcaption className="space-y-1 p-3 text-xs">
                  {photo.isOfficial ? (
                    <p className="font-medium text-primary">Official</p>
                  ) : photo.uploadedByTeamLetter ? (
                    <p className="font-medium">Team {photo.uploadedByTeamLetter}</p>
                  ) : null}
                  {photo.uploaderName && (
                    <p className="text-muted-foreground">{photo.uploaderName}</p>
                  )}
                  {(photo.uploadedByUserId === user?.id || canManage) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={deleteMutation.isPending}
                      onClick={() => void deleteMutation.mutateAsync(photo.id)}
                    >
                      Remove
                    </Button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
          {!data?.data.length && filter !== "official" && (
            <p className="text-sm text-muted-foreground">No media yet.</p>
          )}
          {!data?.data.length && filter === "official" && !albumUrl && (
            <p className="text-sm text-muted-foreground">
              No official media uploaded in-app yet. Ask an admin to set the Google Photos album
              link.
            </p>
          )}
        </>
      )}
    </div>
  );
}
