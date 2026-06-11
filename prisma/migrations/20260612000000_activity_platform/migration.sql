-- CreateTable
CREATE TABLE "ActivityType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ActivityType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventActivity" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "activityTypeId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "allowGeneral" BOOLEAN NOT NULL DEFAULT false,
    "allowGroup" BOOLEAN NOT NULL DEFAULT false,
    "allowStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventActivity_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "allowGeneralParticipants" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowGroupParticipants" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "SpinChallenge" ADD COLUMN     "allowGeneralParticipants" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowGroupParticipants" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "teamId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ActivityType_slug_key" ON "ActivityType"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EventActivity_eventId_activityTypeId_key" ON "EventActivity"("eventId", "activityTypeId");

-- AddForeignKey
ALTER TABLE "EventActivity" ADD CONSTRAINT "EventActivity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventActivity" ADD CONSTRAINT "EventActivity_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinChallenge" ADD CONSTRAINT "SpinChallenge_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
