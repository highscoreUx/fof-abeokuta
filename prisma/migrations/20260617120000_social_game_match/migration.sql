-- CreateTable
CREATE TABLE "SocialGameMatch" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "state" JSONB NOT NULL DEFAULT '{}',
    "winnerUserId" TEXT,
    "currentTurnUserId" TEXT,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialGameMatch_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ChatGameSession" ADD COLUMN "socialMatchId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ChatGameSession_socialMatchId_key" ON "ChatGameSession"("socialMatchId");

-- CreateIndex
CREATE INDEX "SocialGameMatch_eventId_kind_status_idx" ON "SocialGameMatch"("eventId", "kind", "status");

-- AddForeignKey
ALTER TABLE "SocialGameMatch" ADD CONSTRAINT "SocialGameMatch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatGameSession" ADD CONSTRAINT "ChatGameSession_socialMatchId_fkey" FOREIGN KEY ("socialMatchId") REFERENCES "SocialGameMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
