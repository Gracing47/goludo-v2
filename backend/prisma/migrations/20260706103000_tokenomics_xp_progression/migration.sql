-- Tokenomics XP progression (G-024) — purely additive, no data loss.
-- Adds non-monetary Season-1 XP columns + AI practice-mode counters to UserProfile.
-- Safe on the live DB: new columns carry defaults / are nullable.

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "totalXp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "classicXp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rapidXp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "computerXp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aiGamesPlayed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dailyAiGamesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dailyAiResetDate" TEXT;

-- CreateIndex
CREATE INDEX "UserProfile_totalXp_idx" ON "UserProfile"("totalXp");
