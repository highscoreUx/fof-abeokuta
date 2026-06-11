/*
  Warnings:

  - The primary key for the `AppSetting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `name` on the `Event` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventId,key]` on the table `AppSetting` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Event` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eventId,position]` on the table `Sponsor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eventId,letter]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventId` to the `AgendaItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `AppSetting` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `AppSetting` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `eventId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `Quiz` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `ScoreCriterion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `SpinChallenge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `Sponsor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `Team` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'LIVE', 'ARCHIVED');

-- DropIndex
DROP INDEX "Sponsor_position_key";

-- DropIndex
DROP INDEX "Team_letter_key";

-- AlterTable
ALTER TABLE "AgendaItem" ADD COLUMN     "eventId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AppSetting" DROP CONSTRAINT "AppSetting_pkey",
ADD COLUMN     "eventId" TEXT NOT NULL,
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "eventId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "name",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "eventId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "eventId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ScoreCriterion" ADD COLUMN     "eventId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SpinChallenge" ADD COLUMN     "eventId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sponsor" ADD COLUMN     "eventId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "eventId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "loginPhrase" TEXT;

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "eventId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRefreshToken" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformRefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_eventId_key_key" ON "AppSetting"("eventId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_eventId_position_key" ON "Sponsor"("eventId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Team_eventId_letter_key" ON "Team"("eventId", "letter");

-- AddForeignKey
ALTER TABLE "PlatformRefreshToken" ADD CONSTRAINT "PlatformRefreshToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaItem" ADD CONSTRAINT "AgendaItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCriterion" ADD CONSTRAINT "ScoreCriterion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinChallenge" ADD CONSTRAINT "SpinChallenge_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
