"use client";

import { AgendaEmpty } from "@/components/agenda/AgendaEmpty";
import { GalleryGridSkeleton } from "@/components/gallery/GalleryGridSkeleton";
import { GalleryMasonry, galleryMasonryItemClassName } from "@/components/gallery/GalleryMasonry";
import { GalleryMediaPreview } from "@/components/gallery/GalleryMediaPreview";
import { useAuth } from "@/hooks/useAuth";
import { useGalleryDeleteMutation, useGalleryQuery } from "@/hooks/useGalleryQuery";
import { useHasPermission } from "@/hooks/useHasPermission";
import { galleryEmptyMessage } from "@/lib/gallery-filters";
import type { GalleryFilter, GalleryPhotoRow } from "@/types/gallery";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface GalleryPanelProps {
  filter: GalleryFilter;
  team?: string;
}

export function GalleryPanel({ filter, team }: GalleryPanelProps) {
  const { user } = useAuth();
  const canManage = useHasPermission("gallery.manage");

  const { data, isLoading } = useGalleryQuery({
    filter: filter === "team" ? "team" : filter,
    team: filter === "team" ? team : undefined,
    pollPending: true,
  });

  const deleteMutation = useGalleryDeleteMutation();

  const albumUrl = data?.library.officialGalleryUrl;
  const showOfficialLink = filter === "official" && albumUrl;
  const photos = data?.data ?? [];
  const isEmpty = !isLoading && photos.length === 0;

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
        <GalleryGridSkeleton />
      ) : isEmpty ? (
        <AgendaEmpty
          message={galleryEmptyMessage(filter, {
            team,
            officialGalleryUrl: albumUrl,
          })}
        />
      ) : (
        <GalleryMasonry>
          {photos.map((photo: GalleryPhotoRow) => (
            <figure
              key={photo.id}
              className={galleryMasonryItemClassName(
                cn(
                  "group overflow-hidden rounded-xl border border-border bg-card",
                  photo.status !== "READY" && "opacity-80",
                ),
              )}
            >
              <GalleryMediaPreview photo={photo} layout="masonry" />
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
        </GalleryMasonry>
      )}
    </div>
  );
}
