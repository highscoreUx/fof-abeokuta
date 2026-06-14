"use client";

import { AgendaEmpty } from "@/components/agenda/AgendaEmpty";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { GalleryGridSkeleton } from "@/components/gallery/GalleryGridSkeleton";
import { GalleryGridTile } from "@/components/gallery/GalleryGridTile";
import { useAuth } from "@/hooks/useAuth";
import { useGalleryDeleteMutation, useGalleryQuery } from "@/hooks/useGalleryQuery";
import { useHasPermission } from "@/hooks/useHasPermission";
import { galleryEmptyMessage } from "@/lib/gallery-filters";
import type { GalleryFilter } from "@/types/gallery";
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
    <div className="min-w-0 w-full space-y-6">
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
        <GalleryGrid>
          {photos.map((photo) => (
            <GalleryGridTile
              key={photo.id}
              photo={photo}
              canDelete={photo.uploadedByUserId === user?.id || canManage}
              isDeleting={deleteMutation.isPending}
              onDelete={() => void deleteMutation.mutateAsync(photo.id)}
            />
          ))}
        </GalleryGrid>
      )}
    </div>
  );
}
