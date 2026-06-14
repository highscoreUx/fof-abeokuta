"use client";

import { useEffect, useState } from "react";
import { AgendaEmpty } from "@/components/agenda/AgendaEmpty";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { GalleryGridSkeleton } from "@/components/gallery/GalleryGridSkeleton";
import { GalleryGridTile } from "@/components/gallery/GalleryGridTile";
import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/hooks/useAuth";
import {
  GALLERY_PAGE_LIMIT,
  useGalleryDeleteMutation,
  useGalleryQuery,
} from "@/hooks/useGalleryQuery";
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
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filter, team]);

  const { data, isLoading, isFetching } = useGalleryQuery({
    filter: filter === "team" ? "team" : filter,
    team: filter === "team" ? team : undefined,
    page,
    pollPending: true,
  });

  const deleteMutation = useGalleryDeleteMutation();

  const albumUrl = data?.library.officialGalleryUrl;
  const showOfficialLink = filter === "official" && albumUrl;
  const photos = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const showInitialSkeleton = isLoading && !data;
  const isEmpty = !showInitialSkeleton && photos.length === 0;

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

      {showInitialSkeleton ? (
        <GalleryGridSkeleton />
      ) : isEmpty ? (
        <AgendaEmpty
          message={galleryEmptyMessage(filter, {
            team,
            officialGalleryUrl: albumUrl,
          })}
        />
      ) : (
        <div className="space-y-6">
          <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
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
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={GALLERY_PAGE_LIMIT}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
