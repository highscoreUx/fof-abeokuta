-- Hangman social / chat game support (must run after HangmanMatch exists)
ALTER TABLE "HangmanMatch" ADD COLUMN IF NOT EXISTS "isSocial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HangmanMatch" ADD COLUMN IF NOT EXISTS "playerXUserId" TEXT;
ALTER TABLE "HangmanMatch" ADD COLUMN IF NOT EXISTS "playerOUserId" TEXT;
ALTER TABLE "HangmanMatch" ADD COLUMN IF NOT EXISTS "winnerUserId" TEXT;

ALTER TABLE "HangmanMatch" ALTER COLUMN "teamXId" DROP NOT NULL;
ALTER TABLE "HangmanMatch" ALTER COLUMN "teamOId" DROP NOT NULL;

ALTER TABLE "TicTacToeMatch" DROP CONSTRAINT IF EXISTS "TicTacToeMatch_teamXId_fkey";
ALTER TABLE "TicTacToeMatch" DROP CONSTRAINT IF EXISTS "TicTacToeMatch_teamOId_fkey";
ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_teamXId_fkey"
  FOREIGN KEY ("teamXId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicTacToeMatch" ADD CONSTRAINT "TicTacToeMatch_teamOId_fkey"
  FOREIGN KEY ("teamOId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HangmanMatch" DROP CONSTRAINT IF EXISTS "HangmanMatch_teamXId_fkey";
ALTER TABLE "HangmanMatch" DROP CONSTRAINT IF EXISTS "HangmanMatch_teamOId_fkey";
ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_teamXId_fkey"
  FOREIGN KEY ("teamXId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_teamOId_fkey"
  FOREIGN KEY ("teamOId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChatGameSession" ADD COLUMN IF NOT EXISTS "hangmanMatchId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ChatGameSession_hangmanMatchId_key" ON "ChatGameSession"("hangmanMatchId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'HangmanMatch_playerXUserId_fkey'
  ) THEN
    ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_playerXUserId_fkey"
      FOREIGN KEY ("playerXUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'HangmanMatch_playerOUserId_fkey'
  ) THEN
    ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_playerOUserId_fkey"
      FOREIGN KEY ("playerOUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'HangmanMatch_winnerUserId_fkey'
  ) THEN
    ALTER TABLE "HangmanMatch" ADD CONSTRAINT "HangmanMatch_winnerUserId_fkey"
      FOREIGN KEY ("winnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChatGameSession_hangmanMatchId_fkey'
  ) THEN
    ALTER TABLE "ChatGameSession" ADD CONSTRAINT "ChatGameSession_hangmanMatchId_fkey"
      FOREIGN KEY ("hangmanMatchId") REFERENCES "HangmanMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
