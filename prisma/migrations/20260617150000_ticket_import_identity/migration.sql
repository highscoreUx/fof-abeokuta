-- Ticket import identity: nullable account email, fingerprint, per-event ticket numbers

ALTER TABLE "Account" ALTER COLUMN "email" DROP NOT NULL;

ALTER TABLE "Account" ADD COLUMN "registrationFingerprint" TEXT;
ALTER TABLE "Account" ADD COLUMN "maskedEmail" TEXT;
ALTER TABLE "Account" ADD COLUMN "importSource" TEXT;

CREATE UNIQUE INDEX "Account_registrationFingerprint_key" ON "Account"("registrationFingerprint");

ALTER TABLE "User" ADD COLUMN "ticketNumber" TEXT;
ALTER TABLE "User" ADD COLUMN "orderNumber" TEXT;

CREATE UNIQUE INDEX "User_eventId_ticketNumber_key" ON "User"("eventId", "ticketNumber");
