-- Standardize challenge-level config JSON for hybrid activity manifest.

ALTER TABLE "Quiz" ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "CountdownChallenge" ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Survey" ADD COLUMN "config" JSONB NOT NULL DEFAULT '{}';
