"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEventApi } from "@/hooks/useEventApi";
import { eventApiUpload } from "@/lib/api-client";
import { readGalleryFileDimensions } from "@/lib/gallery-file-dimensions";
import type { GalleryFilter, GalleryListResponse, GalleryPhotoRow } from "@/types/gallery";

export const GALLERY_PAGE_LIMIT = 24;

export function galleryQueryKey(
  slug: string,
  filter: GalleryFilter,
  team?: string,
  page = 1,
) {
  return ["gallery", slug, filter, team ?? "", page] as const;
}

export function useGalleryQuery(options: {
  filter: GalleryFilter;
  team?: string;
  page?: number;
  pollPending?: boolean;
}) {
  const { slug, api } = useEventApi();
  const page = options.page ?? 1;

  return useQuery({
    queryKey: galleryQueryKey(slug, options.filter, options.team, page),
    queryFn: () => {
      const params = new URLSearchParams({
        filter: options.filter,
        page: String(page),
        limit: String(GALLERY_PAGE_LIMIT),
      });
      if (options.filter === "team" && options.team) {
        params.set("team", options.team);
      }
      return api<GalleryListResponse>(`/gallery?${params.toString()}`);
    },
    refetchInterval: options.pollPending
      ? (query) => {
          const rows = query.state.data?.data ?? [];
          return rows.some(
            (row: GalleryPhotoRow) =>
              row.status === "PENDING" || row.status === "PROCESSING",
          )
            ? 3000
            : false;
        }
      : false,
    placeholderData: keepPreviousData,
  });
}

export function useGalleryUploadMutation() {
  const { slug, api } = useEventApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { files: File[]; isOfficial?: boolean; caption?: string }) => {
      const formData = new FormData();
      const fileMeta = await Promise.all(input.files.map((file) => readGalleryFileDimensions(file)));
      for (const file of input.files) {
        formData.append("files", file);
      }
      formData.set("fileMeta", JSON.stringify(fileMeta));
      if (input.isOfficial) formData.set("isOfficial", "true");
      if (input.caption) formData.set("caption", input.caption);

      return eventApiUpload<{ photos: GalleryListResponse["data"] }>(slug, "/gallery", formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gallery", slug] });
    },
  });
}

export function useGalleryDeleteMutation() {
  const { slug, api } = useEventApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoId: string) =>
      api<{ ok: boolean }>(`/gallery/${photoId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gallery", slug] });
    },
  });
}
