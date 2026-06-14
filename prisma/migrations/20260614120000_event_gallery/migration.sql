-- Event photo library + queued gallery uploads

CREATE TYPE "GalleryPhotoStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

CREATE TABLE "EventPhotoLibrary" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "officialGalleryUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPhotoLibrary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "uploadedByTeamId" TEXT,
    "uploadedByTeamName" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "status" "GalleryPhotoStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "url" TEXT,
    "thumbnailUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "originalFilename" TEXT,
    "caption" TEXT,
    "errorMessage" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventPhotoLibrary_eventId_key" ON "EventPhotoLibrary"("eventId");

CREATE INDEX "GalleryPhoto_eventId_status_uploadedAt_idx" ON "GalleryPhoto"("eventId", "status", "uploadedAt");
CREATE INDEX "GalleryPhoto_libraryId_idx" ON "GalleryPhoto"("libraryId");
CREATE INDEX "GalleryPhoto_uploadedByUserId_idx" ON "GalleryPhoto"("uploadedByUserId");
CREATE INDEX "GalleryPhoto_uploadedByTeamId_idx" ON "GalleryPhoto"("uploadedByTeamId");

ALTER TABLE "EventPhotoLibrary" ADD CONSTRAINT "EventPhotoLibrary_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "EventPhotoLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_uploadedByTeamId_fkey" FOREIGN KEY ("uploadedByTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "EventPhotoLibrary" ("id", "eventId", "updatedAt")
SELECT 'epl_' || e."id", e."id", CURRENT_TIMESTAMP
FROM "Event" e
WHERE NOT EXISTS (
  SELECT 1 FROM "EventPhotoLibrary" l WHERE l."eventId" = e."id"
);
