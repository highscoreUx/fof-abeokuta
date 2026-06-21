"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { AgendaEmpty } from "@/components/agenda/AgendaEmpty";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { GalleryGridSkeleton } from "@/components/gallery/GalleryGridSkeleton";
import { GalleryGridTile } from "@/components/gallery/GalleryGridTile";
import {
  GalleryMobileHeader,
  GalleryNativeFilterChips,
} from "@/components/gallery/GalleryNativeMobile";
import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/hooks/useAuth";
import {
  GALLERY_PAGE_LIMIT,
  useGalleryDeleteMutation,
  useGalleryQuery,
} from "@/hooks/useGalleryQuery";
import { useHasPermission } from "@/hooks/useHasPermission";
import { galleryEmptyMessage } from "@/lib/gallery-filters";
import type { GalleryFilter, GalleryPhotoRow } from "@/types/gallery";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface GalleryPanelProps {
  filter: GalleryFilter;
  team?: string;
  onFilterChange?: (filter: GalleryFilter, team?: string) => void;
}

function GalleryOfficialAlbumBanner({ albumUrl }: { albumUrl: string }) {
  return (
    <a
      href={albumUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 border-b border-border/50 bg-muted/40 px-4 py-3 text-sm font-medium text-primary lg:hidden"
    >
      <ArrowSquareOut size={18} weight="bold" aria-hidden />
      View official album
    </a>
  );
}

function GalleryPhotoGrid({
  photos,
  native,
  userId,
  canManage,
  isDeleting,
  onDelete,
}: {
  photos: GalleryPhotoRow[];
  native: boolean;
  userId?: string;
  canManage: boolean;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <GalleryGrid native={native}>
      {photos.map((photo) => (
        <GalleryGridTile
          key={photo.id}
          photo={photo}
          native={native}
          canDelete={photo.uploadedByUserId === userId || canManage}
          isDeleting={isDeleting}
          onDelete={() => onDelete(photo.id)}
        />
      ))}
    </GalleryGrid>
  );
}

export function GalleryPanel({ filter, team, onFilterChange }: GalleryPanelProps) {
  const { user } = useAuth();
  const canManage = useHasPermission("gallery.manage");
  const [page, setPage] = useState(1);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

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
  const emptyMessage = galleryEmptyMessage(filter, {
    team,
    officialGalleryUrl: albumUrl,
  });

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    mobileScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const gridProps = {
    photos,
    userId: user?.id,
    canManage,
    isDeleting: deleteMutation.isPending,
    onDelete: (id: string) => void deleteMutation.mutateAsync(id),
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <GalleryMobileHeader />
        {onFilterChange && (
          <GalleryNativeFilterChips
            filter={filter}
            team={team}
            onFilterChange={onFilterChange}
          />
        )}
        <div
          ref={mobileScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
        >
          {showOfficialLink && <GalleryOfficialAlbumBanner albumUrl={albumUrl} />}

          {showInitialSkeleton ? (
            <GalleryGridSkeleton native />
          ) : isEmpty ? (
            <p className="px-6 py-16 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <div className={isFetching ? "opacity-70 transition-opacity" : undefined}>
              <GalleryPhotoGrid {...gridProps} native />
            </div>
          )}

          {!isEmpty && (
            <div className="px-4 py-4">
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
      </div>

      <div className="hidden min-w-0 w-full space-y-6 lg:block">
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
          <AgendaEmpty message={emptyMessage} />
        ) : (
          <div className="space-y-6">
            <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
              <GalleryPhotoGrid {...gridProps} native={false} />
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
    </>
  );
}
