-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF', 'JUDGE', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "SponsorPosition" AS ENUM ('BOTTOM_LEFT', 'BOTTOM_RIGHT');

-- CreateEnum
CREATE TYPE "QuizSessionState" AS ENUM ('LOBBY', 'QUESTION', 'RESULTS', 'FINISHED');

-- CreateEnum
CREATE TYPE "SpinChallengeState" AS ENUM ('IDLE', 'ACTIVE', 'REVIEWING', 'COMPLETED');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "letter" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "pinHash" TEXT NOT NULL,
    "pinDisplay" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "teamId" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "checkedInBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" "SponsorPosition" NOT NULL,
    "visibleOnPublicOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "timeLimitSec" INTEGER NOT NULL DEFAULT 20,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSession" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "state" "QuizSessionState" NOT NULL DEFAULT 'LOBBY',
    "currentQuestionId" TEXT,
    "questionIndex" INTEGER NOT NULL DEFAULT 0,
    "questionStartedAt" TIMESTAMP(3),
    "resultsEndsAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "answerIndex" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "open" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteBallot" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,
    "selections" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteBallot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreCriterion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxPoints" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScoreCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpinChallenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "state" "SpinChallengeState" NOT NULL DEFAULT 'IDLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpinChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpinSubmission" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_letter_key" ON "Team"("letter");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sponsor_position_key" ON "Sponsor"("position");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAnswer_sessionId_questionId_userId_key" ON "QuizAnswer"("sessionId", "questionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "VoteBallot_voteId_userId_key" ON "VoteBallot"("voteId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Score_teamId_judgeId_criterionId_key" ON "Score"("teamId", "judgeId", "criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "SpinSubmission_challengeId_teamId_key" ON "SpinSubmission"("challengeId", "teamId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteBallot" ADD CONSTRAINT "VoteBallot_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "Vote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteBallot" ADD CONSTRAINT "VoteBallot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteBallot" ADD CONSTRAINT "VoteBallot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "ScoreCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinSubmission" ADD CONSTRAINT "SpinSubmission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "SpinChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinSubmission" ADD CONSTRAINT "SpinSubmission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinSubmission" ADD CONSTRAINT "SpinSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
