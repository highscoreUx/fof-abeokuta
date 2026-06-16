-- Spinner social chat games + spectator invites
ALTER TABLE "SpinnerSession" ADD COLUMN "isSocial" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ChatGameSession" ADD COLUMN "spinnerSessionId" TEXT;
ALTER TABLE "ChatGameSession" ADD COLUMN "invitedSpectatorIds" JSONB NOT NULL DEFAULT '[]';

CREATE UNIQUE INDEX "ChatGameSession_spinnerSessionId_key" ON "ChatGameSession"("spinnerSessionId");

ALTER TABLE "ChatGameSession" ADD CONSTRAINT "ChatGameSession_spinnerSessionId_fkey"
  FOREIGN KEY ("spinnerSessionId") REFERENCES "SpinnerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
