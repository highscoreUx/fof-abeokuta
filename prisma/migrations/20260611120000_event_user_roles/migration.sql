-- CreateTable
CREATE TABLE "EventUserRole" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "permissionsVersion" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventUserRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventUserRole_eventId_slug_key" ON "EventUserRole"("eventId", "slug");

ALTER TABLE "EventUserRole" ADD CONSTRAINT "EventUserRole_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "permissionsVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "User" ADD COLUMN "eventUserRoleId" TEXT,
ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

INSERT INTO "EventUserRole" ("id", "eventId", "name", "slug", "permissions", "permissionsVersion", "isSystem", "createdAt", "updatedAt")
SELECT
  'eur_' || e."id" || '_event_admin',
  e."id",
  'Event admin',
  'event_admin',
  '["*"]'::jsonb,
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Event" e;

INSERT INTO "EventUserRole" ("id", "eventId", "name", "slug", "permissions", "permissionsVersion", "isSystem", "createdAt", "updatedAt")
SELECT
  'eur_' || e."id" || '_coordinator',
  e."id",
  'Coordinator',
  'coordinator',
  '["dashboard.view","user.list","user.create","user.update","user.import","user.check_in","user.assign_teams","user.password.view","agenda.list","agenda.create","agenda.update","agenda.delete","agenda.template","quiz.manage","quiz.run","spin.manage","spin.run","vote.list","vote.create","vote.manage","team.list","team.manage","settings.broadcasting","settings.diagnostics","settings.auto_assign","customize.branding","stage.view"]'::jsonb,
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Event" e;

INSERT INTO "EventUserRole" ("id", "eventId", "name", "slug", "permissions", "permissionsVersion", "isSystem", "createdAt", "updatedAt")
SELECT
  'eur_' || e."id" || '_staff',
  e."id",
  'Staff',
  'staff',
  '["user.list","user.check_in","user.password.view","stage.view"]'::jsonb,
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Event" e;

INSERT INTO "EventUserRole" ("id", "eventId", "name", "slug", "permissions", "permissionsVersion", "isSystem", "createdAt", "updatedAt")
SELECT
  'eur_' || e."id" || '_judge',
  e."id",
  'Judge',
  'judge',
  '["score.submit","score.view_all","stage.view"]'::jsonb,
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Event" e;

INSERT INTO "EventUserRole" ("id", "eventId", "name", "slug", "permissions", "permissionsVersion", "isSystem", "createdAt", "updatedAt")
SELECT
  'eur_' || e."id" || '_participant',
  e."id",
  'Participant',
  'participant',
  '["participant.home","participant.activities","participant.chat","participant.quiz","participant.vote","stage.view"]'::jsonb,
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Event" e;

UPDATE "User" u
SET "eventUserRoleId" = r."id"
FROM "EventUserRole" r
WHERE u."eventId" = r."eventId"
  AND (
    (u."role" = 'ADMIN' AND r."slug" = 'event_admin') OR
    (u."role" = 'STAFF' AND r."slug" = 'staff') OR
    (u."role" = 'JUDGE' AND r."slug" = 'judge') OR
    (u."role" = 'PARTICIPANT' AND r."slug" = 'participant')
  );

UPDATE "User" u
SET "eventUserRoleId" = r."id"
FROM "EventUserRole" r
WHERE u."eventUserRoleId" IS NULL
  AND u."eventId" = r."eventId"
  AND r."slug" = 'participant';

ALTER TABLE "User" ALTER COLUMN "eventUserRoleId" SET NOT NULL;

ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "Role";

ALTER TABLE "User" ADD CONSTRAINT "User_eventUserRoleId_fkey" FOREIGN KEY ("eventUserRoleId") REFERENCES "EventUserRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
