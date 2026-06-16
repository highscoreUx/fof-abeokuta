-- CreateEnum
CREATE TYPE "ChatGameChannel" AS ENUM ('DM', 'TEAM');

-- CreateEnum
CREATE TYPE "ChatGameSessionStatus" AS ENUM ('LOBBY', 'LIVE', 'ENDED', 'CANCELLED');

-- AlterTable
ALTER TABLE "TicTacToeMatch" ADD COLUMN "isSocial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TicTacToeMatch" ADD COLUMN "playerXUserId" TEXT;
ALTER TABLE "TicTacToeMatch" ADD COLUMN "playerOUserId" TEXT;
ALTER TABLE "TicTacToeMatch" ADD COLUMN "winnerUserId" TEXT;
ALTER TABLE "TicTacToeMatch" ALTER COLUMN "teamXId" DROP NOT NULL;
ALTER TABLE "TicTacToeMatch" ALTER COLUMN "teamOId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ChatGameSession" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'social',
    "hostUserId" TEXT NOT NULL,
    "channel" "ChatGameChannel" NOT NULL,
    "teamId" TEXT,
    "dmPeerUserId" TEXT,
    "messageId" TEXT,
    "joinPolicy" TEXT NOT NULL DEFAULT 'invite_only',
    "maxPlayers" INTEGER NOT NULL DEFAULT 2,
    "status" "ChatGameSessionStatus" NOT NULL DEFAULT 'LOBBY',
    "tttMatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatGameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatGameParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "playerSlot" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatGameParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatGameSession_tttMatchId_key" ON "ChatGameSession"("tttMatchId");
CREATE INDEX "ChatGameSession_eventId_status_idx" ON "ChatGameSession"("eventId", "status");
CREATE UNIQUE INDEX "ChatGameParticipant_sessionId_userId_key" ON "ChatGameParticipant"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_playerXUserId_fkey" FOREIGN KEY ("playerXUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_playerOUserId_fkey" FOREIGN KEY ("playerOUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_winnerUserId_fkey" FOREIGN KEY ("winnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatGameSession" ADD CONSTRAINT "ChatGameSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatGameSession" ADD CONSTRAINT "ChatGameSession_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatGameSession" ADD CONSTRAINT "ChatGameSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatGameSession" ADD CONSTRAINT "ChatGameSession_tttMatchId_fkey" FOREIGN KEY ("tttMatchId") REFERENCES "TicTacToeMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatGameParticipant" ADD CONSTRAINT "ChatGameParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatGameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatGameParticipant" ADD CONSTRAINT "ChatGameParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
