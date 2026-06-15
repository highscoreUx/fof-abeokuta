-- CreateEnum
CREATE TYPE "ActivityCompetitionFormat" AS ENUM ('SINGLE_MATCH', 'CHAMPIONSHIP');

-- CreateEnum
CREATE TYPE "ActivityBracketState" AS ENUM ('SETUP', 'ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "ActivityBracketRoundState" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ActivityBracketSlotState" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETE');

-- AlterTable
ALTER TABLE "TicTacToeChallenge" ADD COLUMN "competitionFormat" "ActivityCompetitionFormat" NOT NULL DEFAULT 'SINGLE_MATCH';
ALTER TABLE "TicTacToeChallenge" ADD COLUMN "targetWins" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "HangmanChallenge" ADD COLUMN "competitionFormat" "ActivityCompetitionFormat" NOT NULL DEFAULT 'SINGLE_MATCH';
ALTER TABLE "HangmanChallenge" ADD COLUMN "targetWins" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "TicTacToeMatch" ADD COLUMN "bracketSlotId" TEXT;

-- AlterTable
ALTER TABLE "HangmanMatch" ADD COLUMN "bracketSlotId" TEXT;

-- CreateTable
CREATE TABLE "ActivityBracket" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "tttChallengeId" TEXT,
    "hangmanChallengeId" TEXT,
    "state" "ActivityBracketState" NOT NULL DEFAULT 'SETUP',
    "targetWins" INTEGER NOT NULL DEFAULT 1,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "championTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityBracketRound" (
    "id" TEXT NOT NULL,
    "bracketId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "state" "ActivityBracketRoundState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityBracketRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityBracketSlot" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "teamAId" TEXT NOT NULL,
    "teamBId" TEXT,
    "teamAWins" INTEGER NOT NULL DEFAULT 0,
    "teamBWins" INTEGER NOT NULL DEFAULT 0,
    "winnerTeamId" TEXT,
    "isBye" BOOLEAN NOT NULL DEFAULT false,
    "state" "ActivityBracketSlotState" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityBracketSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityBracket_tttChallengeId_key" ON "ActivityBracket"("tttChallengeId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityBracket_hangmanChallengeId_key" ON "ActivityBracket"("hangmanChallengeId");

-- CreateIndex
CREATE INDEX "ActivityBracket_eventId_state_idx" ON "ActivityBracket"("eventId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityBracketRound_bracketId_roundNumber_key" ON "ActivityBracketRound"("bracketId", "roundNumber");

-- CreateIndex
CREATE INDEX "ActivityBracketSlot_roundId_state_idx" ON "ActivityBracketSlot"("roundId", "state");

-- CreateIndex
CREATE INDEX "TicTacToeMatch_bracketSlotId_idx" ON "TicTacToeMatch"("bracketSlotId");

-- CreateIndex
CREATE INDEX "HangmanMatch_bracketSlotId_idx" ON "HangmanMatch"("bracketSlotId");

-- AddForeignKey
ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_bracketSlotId_fkey" FOREIGN KEY ("bracketSlotId") REFERENCES "ActivityBracketSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_bracketSlotId_fkey" FOREIGN KEY ("bracketSlotId") REFERENCES "ActivityBracketSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBracket" ADD CONSTRAINT "ActivityBracket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBracket" ADD CONSTRAINT "ActivityBracket_tttChallengeId_fkey" FOREIGN KEY ("tttChallengeId") REFERENCES "TicTacToeChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBracket" ADD CONSTRAINT "ActivityBracket_hangmanChallengeId_fkey" FOREIGN KEY ("hangmanChallengeId") REFERENCES "HangmanChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBracket" ADD CONSTRAINT "ActivityBracket_championTeamId_fkey" FOREIGN KEY ("championTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBracketRound" ADD CONSTRAINT "ActivityBracketRound_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "ActivityBracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBracketSlot" ADD CONSTRAINT "ActivityBracketSlot_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ActivityBracketRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBracketSlot" ADD CONSTRAINT "ActivityBracketSlot_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBracketSlot" ADD CONSTRAINT "ActivityBracketSlot_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBracketSlot" ADD CONSTRAINT "ActivityBracketSlot_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
