"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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

function createOptimisticGalleryPhoto(
  file: File,
  meta: { width: number | null; height: number | null },
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    teamId?: string | null;
    teamLetter?: string | null;
  },
  eventId: string,
  isOfficial: boolean,
  caption?: string,
): GalleryPhotoRow {
  const previewUrl = URL.createObjectURL(file);
  return {
    id: `pending-${crypto.randomUUID()}`,
    eventId,
    uploadedByUserId: user.id,
    uploadedByTeamId: user.teamId ?? null,
    uploadedByTeamLetter: user.teamLetter ?? null,
    uploadedByTeamName: null,
    isOfficial,
    status: "PENDING",
    mimeType: file.type || "application/octet-stream",
    mediaWidth: meta.width,
    mediaHeight: meta.height,
    url: previewUrl,
    thumbnailUrl: previewUrl,
    caption: caption ?? null,
    originalFilename: file.name,
    errorMessage: null,
    uploadedAt: new Date().toISOString(),
    processedAt: null,
    uploaderName: `${user.firstName} ${user.lastName}`.trim(),
    uploaderUsername: user.username,
  };
}

export function useGalleryUploadMutation() {
  const { slug } = useEventApi();
  const { user } = useAuth();
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
    onMutate: async (input) => {
      if (!user) return;

      await queryClient.cancelQueries({ queryKey: ["gallery", slug] });
      const previous = queryClient.getQueriesData<GalleryListResponse>({
        queryKey: ["gallery", slug],
      });

      const fileMeta = await Promise.all(
        input.files.map((file) => readGalleryFileDimensions(file)),
      );
      const placeholders = input.files.map((file, index) =>
        createOptimisticGalleryPhoto(
          file,
          fileMeta[index] ?? { width: null, height: null },
          user,
          slug,
          Boolean(input.isOfficial),
          input.caption,
        ),
      );

      for (const [queryKey, data] of previous) {
        if (!data || !Array.isArray(queryKey) || queryKey[4] !== 1) continue;
        const filter = queryKey[2] as GalleryFilter;
        const shouldShow =
          filter === "all" ||
          filter === "mine" ||
          (filter === "team" && user.teamLetter && queryKey[3] === user.teamLetter) ||
          (filter === "official" && input.isOfficial);
        if (!shouldShow) continue;

        queryClient.setQueryData<GalleryListResponse>(queryKey, {
          ...data,
          data: [...placeholders, ...data.data].slice(0, GALLERY_PAGE_LIMIT),
          total: data.total + placeholders.length,
        });
      }

      return { previous, placeholders };
    },
    onError: (_error, _input, context) => {
      for (const placeholder of context?.placeholders ?? []) {
        if (placeholder.url?.startsWith("blob:")) URL.revokeObjectURL(placeholder.url);
      }
      for (const [queryKey, data] of context?.previous ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },
    onSuccess: (_data, _input, context) => {
      for (const placeholder of context?.placeholders ?? []) {
        if (placeholder.url?.startsWith("blob:")) URL.revokeObjectURL(placeholder.url);
      }
    },
    onSettled: () => {
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
