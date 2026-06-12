-- Global accounts auth (clean break — reset database after applying)

DROP TABLE IF EXISTS "PlatformRefreshToken";
DROP TABLE IF EXISTS "PlatformAdmin";

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");
CREATE UNIQUE INDEX "Account_username_key" ON "Account"("username");

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_eventId_username_key";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_eventId_email_key";

ALTER TABLE "User" DROP COLUMN IF EXISTS "pinHash";
ALTER TABLE "User" DROP COLUMN IF EXISTS "pinDisplay";
ALTER TABLE "User" DROP COLUMN IF EXISTS "loginPhrase";
ALTER TABLE "User" DROP COLUMN IF EXISTS "firstName";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastName";
ALTER TABLE "User" DROP COLUMN IF EXISTS "middleName";
ALTER TABLE "User" DROP COLUMN IF EXISTS "username";
ALTER TABLE "User" DROP COLUMN IF EXISTS "email";

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountId" TEXT;

-- Full reset (no legacy data migration)
TRUNCATE TABLE "User" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "RefreshToken" RESTART IDENTITY CASCADE;

ALTER TABLE "User" ALTER COLUMN "accountId" SET NOT NULL;

ALTER TABLE "RefreshToken" ADD COLUMN IF NOT EXISTS "accountId" TEXT;
ALTER TABLE "RefreshToken" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "User"
ADD CONSTRAINT "User_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "User_accountId_eventId_key" ON "User"("accountId", "eventId");

ALTER TABLE "RefreshToken"
ADD CONSTRAINT "RefreshToken_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefreshToken" ALTER COLUMN "accountId" SET NOT NULL;
