-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_teamId_fkey";

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
