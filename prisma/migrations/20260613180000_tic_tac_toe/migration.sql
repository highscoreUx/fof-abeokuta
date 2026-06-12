-- Activity type
INSERT INTO "ActivityType" (id, slug, name, description, "sortOrder")
SELECT gen_random_uuid()::text, 'tic_tac_toe', 'Team Tic-Tac-Toe', 'Teams compete on a 3×3 grid — champion or council mode.', 4
WHERE NOT EXISTS (SELECT 1 FROM "ActivityType" WHERE slug = 'tic_tac_toe');

CREATE TYPE "TicTacToeMode" AS ENUM ('CHAMPION', 'COUNCIL');
CREATE TYPE "TicTacToeMatchState" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED');

CREATE TABLE "TicTacToeChallenge" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" "TicTacToeMode" NOT NULL DEFAULT 'CHAMPION',
    "config" JSONB NOT NULL DEFAULT '{}',
    "allowGeneralParticipants" BOOLEAN NOT NULL DEFAULT false,
    "allowGroupParticipants" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicTacToeChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicTacToeMatch" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamXId" TEXT NOT NULL,
    "teamOId" TEXT NOT NULL,
    "state" "TicTacToeMatchState" NOT NULL DEFAULT 'WAITING',
    "board" JSONB NOT NULL,
    "currentTurn" TEXT NOT NULL DEFAULT 'X',
    "turnNumber" INTEGER NOT NULL DEFAULT 0,
    "councilVotes" JSONB NOT NULL DEFAULT '{}',
    "championXUserId" TEXT,
    "championOUserId" TEXT,
    "winnerTeamId" TEXT,
    "isDraw" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "TicTacToeMatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicTacToeMatch_eventId_state_idx" ON "TicTacToeMatch"("eventId", "state");
CREATE INDEX "TicTacToeMatch_challengeId_state_idx" ON "TicTacToeMatch"("challengeId", "state");

ALTER TABLE "TicTacToeChallenge" ADD CONSTRAINT "TicTacToeChallenge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "TicTacToeChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_teamXId_fkey" FOREIGN KEY ("teamXId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_teamOId_fkey" FOREIGN KEY ("teamOId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_championXUserId_fkey" FOREIGN KEY ("championXUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_championOUserId_fkey" FOREIGN KEY ("championOUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
