-- AlterTable
ALTER TABLE "Message" ADD COLUMN "recipientId" TEXT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Message_eventId_recipientId_userId_idx" ON "Message"("eventId", "recipientId", "userId");
