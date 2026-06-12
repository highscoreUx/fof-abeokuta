-- Rename activity type slug
UPDATE "ActivityType"
SET slug = 'spinner', name = 'Spinner', description = 'Spin a wheel to pick a random option. Team members can spectate live spins.'
WHERE slug = 'spin_to_build';

-- Spinner participation mode on challenges
CREATE TYPE "SpinnerParticipationMode" AS ENUM ('CONCURRENT', 'ONE_AT_A_TIME');
CREATE TYPE "SpinnerSessionState" AS ENUM ('ACTIVE', 'COMPLETED');

ALTER TABLE "SpinChallenge"
ADD COLUMN "participationMode" "SpinnerParticipationMode" NOT NULL DEFAULT 'ONE_AT_A_TIME';

-- Backfill options array in config
UPDATE "SpinChallenge"
SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('options', '[]'::jsonb)
WHERE config->'options' IS NULL;

CREATE TABLE "SpinnerSession" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT,
    "state" "SpinnerSessionState" NOT NULL DEFAULT 'ACTIVE',
    "activeUserId" TEXT,
    "startedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "SpinnerSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpinnerSpin" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selectedIndex" INTEGER NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinnerSpin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SpinnerSession_eventId_state_idx" ON "SpinnerSession"("eventId", "state");
CREATE INDEX "SpinnerSession_challengeId_state_idx" ON "SpinnerSession"("challengeId", "state");
CREATE INDEX "SpinnerSpin_sessionId_createdAt_idx" ON "SpinnerSpin"("sessionId", "createdAt");

ALTER TABLE "SpinnerSession" ADD CONSTRAINT "SpinnerSession_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "SpinChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpinnerSession" ADD CONSTRAINT "SpinnerSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpinnerSession" ADD CONSTRAINT "SpinnerSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpinnerSession" ADD CONSTRAINT "SpinnerSession_activeUserId_fkey" FOREIGN KEY ("activeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpinnerSession" ADD CONSTRAINT "SpinnerSession_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SpinnerSpin" ADD CONSTRAINT "SpinnerSpin_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpinnerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpinnerSpin" ADD CONSTRAINT "SpinnerSpin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
