import { hasAnyPermission, hasPermission, type RolePermission } from "@/lib/permissions/catalog";

export function canUploadToGallery(permissions: RolePermission[]): boolean {
  return hasAnyPermission(permissions, [
    "gallery.upload",
    "gallery.media_upload",
    "gallery.official_upload",
  ]);
}

/** Official photographers — every upload is marked official regardless of client input. */
export function forcesOfficialGalleryUpload(permissions: RolePermission[]): boolean {
  return hasPermission(permissions, "gallery.official_upload");
}

export function resolveGalleryUploadOfficialFlag(
  permissions: RolePermission[],
  isOfficialRequested: boolean,
): boolean {
  if (forcesOfficialGalleryUpload(permissions)) return true;

  const canUploadOfficial = hasAnyPermission(permissions, [
    "gallery.media_upload",
    "gallery.manage",
  ]);
  return isOfficialRequested && canUploadOfficial;
}

export function canSubmitGalleryUpload(
  permissions: RolePermission[],
  isOfficialRequested: boolean,
): boolean {
  if (forcesOfficialGalleryUpload(permissions)) return true;

  const canUploadOfficial = hasAnyPermission(permissions, [
    "gallery.media_upload",
    "gallery.manage",
  ]);
  const canUploadParticipant = hasPermission(permissions, "gallery.upload");

  if (isOfficialRequested) return canUploadOfficial;
  return canUploadParticipant;
}
