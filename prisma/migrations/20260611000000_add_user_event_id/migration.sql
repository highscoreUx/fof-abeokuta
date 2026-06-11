-- Bridge: init migration had single-event User rows without eventId.
-- Idempotent so already-upgraded databases can mark this as applied safely.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "eventId" TEXT;

UPDATE "User" u
SET "eventId" = e."id"
FROM (SELECT "id" FROM "Event" ORDER BY "createdAt" ASC LIMIT 1) e
WHERE u."eventId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "eventId" SET NOT NULL;

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_eventId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "User_username_key";
DROP INDEX IF EXISTS "User_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_eventId_username_key" ON "User"("eventId", "username");
CREATE UNIQUE INDEX IF NOT EXISTS "User_eventId_email_key" ON "User"("eventId", "email");
