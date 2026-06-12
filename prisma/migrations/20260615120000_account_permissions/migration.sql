-- Replace isPlatformAdmin flag with account-level permissions (full reset)

TRUNCATE TABLE "Account" RESTART IDENTITY CASCADE;

ALTER TABLE "Account" DROP COLUMN IF EXISTS "isPlatformAdmin";
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "permissions" JSONB NOT NULL DEFAULT '[]';
