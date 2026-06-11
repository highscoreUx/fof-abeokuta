-- AlterTable
ALTER TABLE "Message" ADD COLUMN "staffChannel" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Message_eventId_staffChannel_idx" ON "Message"("eventId", "staffChannel");
