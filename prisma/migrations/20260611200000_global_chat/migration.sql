-- Allow event-wide (global) messages without a team
ALTER TABLE "Message" ALTER COLUMN "teamId" DROP NOT NULL;
