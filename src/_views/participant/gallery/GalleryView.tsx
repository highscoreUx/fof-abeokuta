"use client";

import { useRef, useState } from "react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useEventNav } from "@/hooks/useEventNav";
import {
  useGalleryDeleteMutation,
  useGalleryQuery,
  useGalleryUploadMutation,
} from "@/hooks/useGalleryQuery";
import { useHasAnyPermission, useHasPermission } from "@/hooks/useHasPermission";
import { hasAdminShellAccess } from "@/lib/permissions";
import { toastError, toastSuccess } from "@/lib/toast";
import type { GalleryFilter, GalleryPhotoRow } from "@/types/gallery";
import { cn } from "@/lib/cn";

const TEAM_LETTERS = ["F", "I", "G", "M", "A"] as const;

const FILTERS: Array<{ id: GalleryFilter | "team"; label: string; team?: string }> = [
  { id: "all", label: "All" },
  { id: "official", label: "Official" },
  ...TEAM_LETTERS.map((letter) => ({ id: "team" as const, label: letter, team: letter })),
  { id: "mine", label: "Mine" },
];

export function GalleryView() {
  const { user } = useAuth();
  const { nav, participantNav, staffNav } = useEventNav();
  const shellNav = user && hasAdminShellAccess(user.permissions) ? nav : staffNav.length > 1 ? staffNav : participantNav;

  const canUpload = useHasAnyPermission(["gallery.upload", "gallery.media_upload"]);
  const canUploadOfficial = useHasAnyPermission(["gallery.media_upload", "gallery.manage"]);
  const canManage = useHasPermission("gallery.manage");
  const canView = useHasPermission("gallery.view");

  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [team, setTeam] = useState<string | undefined>();
  const [officialMode, setOfficialMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isFetching } = useGalleryQuery({
    filter: filter === "team" ? "team" : filter,
    team: filter === "team" ? team : undefined,
    pollPending: true,
  });

  const uploadMutation = useGalleryUploadMutation();
  const deleteMutation = useGalleryDeleteMutation();

  const selectFilter = (next: GalleryFilter, nextTeam?: string) => {
    setFilter(next);
    setTeam(nextTeam);
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    try {
      await uploadMutation.mutateAsync({
        files,
        isOfficial: officialMode && canUploadOfficial,
      });
      toastSuccess(
        files.length === 1 ? "Photo queued for upload" : `${files.length} photos queued for upload`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toastError("Upload failed", error instanceof Error ? error.message : undefined);
    }
  };

  const albumUrl = data?.library.officialGalleryUrl;
  const showOfficialLink = filter === "official" && albumUrl;

  return (
    <PermissionGuard permission="gallery.view">
      <AppShell title="Gallery" nav={shellNav}>
        <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle>Gallery</CardTitle>
              <CardDescription>
                Photos upload to your Google Photos account via API. FOF stores who uploaded and
                which team — filters run on our database. Open the album link to browse everything
                in Google Photos.
              </CardDescription>
            </div>
            {data?.library.officialGalleryUrl && (
              <a
                href={data.library.officialGalleryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium"
              >
                Open album in Google Photos
              </a>
            )}
              {canUpload && canView && (
                <div className="flex flex-wrap items-center gap-2">
                  {canUploadOfficial && (
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={officialMode}
                        onChange={(event) => setOfficialMode(event.target.checked)}
                      />
                      Official photo
                    </label>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(event) => void handleUpload(event.target.files)}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? "Queuing…" : "Upload photos"}
                  </Button>
                </div>
              )}
            </CardHeader>
          </Card>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const active =
                item.id === "team"
                  ? filter === "team" && team === item.team
                  : filter === item.id;
              return (
                <Button
                  key={item.id === "team" ? `team-${item.team}` : item.id}
                  size="sm"
                  variant={active ? "primary" : "outline"}
                  onClick={() =>
                    selectFilter(item.id === "team" ? "team" : item.id, item.team)
                  }
                >
                  {item.label}
                </Button>
              );
            })}
          </div>

          {showOfficialLink && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Official album</CardTitle>
                <CardDescription>
                  Curated photos live in Google Photos. Open the album to view branded official
                  shots.
                </CardDescription>
                <div>
                  <a
                    href={albumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    View official photos
                  </a>
                </div>
              </CardHeader>
            </Card>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading gallery…</p>
          ) : (
            <>
              {isFetching && (
                <p className="text-xs text-muted-foreground">Refreshing…</p>
              )}
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
                      {photo.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.thumbnailUrl}
                          alt={photo.caption ?? photo.originalFilename ?? "Gallery photo"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                          {photo.status === "FAILED"
                            ? photo.errorMessage ?? "Upload failed"
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
                <p className="text-sm text-muted-foreground">No photos yet.</p>
              )}
              {!data?.data.length && filter === "official" && !albumUrl && (
                <p className="text-sm text-muted-foreground">
                  No official photos uploaded in-app yet. Ask an admin to set the Google Photos
                  album link.
                </p>
              )}
            </>
          )}
        </div>
      </AppShell>
    </PermissionGuard>
  );
}
