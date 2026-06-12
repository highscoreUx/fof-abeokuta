-- Event-scoped permission override on User (staff for this event only)

ALTER TABLE "User" ADD COLUMN "permissions" JSONB;
