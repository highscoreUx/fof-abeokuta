-- CreateEnum
CREATE TYPE "CountdownSessionState" AS ENUM ('RUNNING', 'PAUSED', 'FINISHED');

-- CreateTable
CREATE TABLE "CountdownChallenge" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 300,
    "allowGeneralParticipants" BOOLEAN NOT NULL DEFAULT true,
    "allowGroupParticipants" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountdownChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountdownSession" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "state" "CountdownSessionState" NOT NULL DEFAULT 'RUNNING',
    "segmentDurationMs" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "pausedRemainingMs" INTEGER,
    "startedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CountdownSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CountdownSession_eventId_state_idx" ON "CountdownSession"("eventId", "state");

-- CreateIndex
CREATE INDEX "CountdownSession_challengeId_state_idx" ON "CountdownSession"("challengeId", "state");

-- AddForeignKey
ALTER TABLE "CountdownChallenge" ADD CONSTRAINT "CountdownChallenge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountdownSession" ADD CONSTRAINT "CountdownSession_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "CountdownChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountdownSession" ADD CONSTRAINT "CountdownSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountdownSession" ADD CONSTRAINT "CountdownSession_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
