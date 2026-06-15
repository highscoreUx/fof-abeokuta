-- CreateEnum
CREATE TYPE "HangmanMode" AS ENUM ('CHAMPION', 'COUNCIL');

-- CreateEnum
CREATE TYPE "HangmanMatchState" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED');

-- CreateTable
CREATE TABLE "HangmanChallenge" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" "HangmanMode" NOT NULL DEFAULT 'CHAMPION',
    "config" JSONB NOT NULL DEFAULT '{}',
    "maxWrongGuesses" INTEGER NOT NULL DEFAULT 6,
    "allowGeneralParticipants" BOOLEAN NOT NULL DEFAULT false,
    "allowGroupParticipants" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HangmanChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangmanMatch" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamXId" TEXT NOT NULL,
    "teamOId" TEXT NOT NULL,
    "state" "HangmanMatchState" NOT NULL DEFAULT 'WAITING',
    "secretWord" TEXT NOT NULL DEFAULT '',
    "guessedLetters" JSONB NOT NULL DEFAULT '[]',
    "wrongGuessesX" INTEGER NOT NULL DEFAULT 0,
    "wrongGuessesO" INTEGER NOT NULL DEFAULT 0,
    "currentTurn" TEXT NOT NULL DEFAULT 'X',
    "turnNumber" INTEGER NOT NULL DEFAULT 0,
    "councilVotes" JSONB NOT NULL DEFAULT '{}',
    "championXUserId" TEXT,
    "championOUserId" TEXT,
    "winnerTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "HangmanMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HangmanMatch_eventId_state_idx" ON "HangmanMatch"("eventId", "state");

-- CreateIndex
CREATE INDEX "HangmanMatch_challengeId_state_idx" ON "HangmanMatch"("challengeId", "state");

-- AddForeignKey
ALTER TABLE "HangmanChallenge" ADD CONSTRAINT "HangmanChallenge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "HangmanChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_teamXId_fkey" FOREIGN KEY ("teamXId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_teamOId_fkey" FOREIGN KEY ("teamOId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_championXUserId_fkey" FOREIGN KEY ("championXUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_championOUserId_fkey" FOREIGN KEY ("championOUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
