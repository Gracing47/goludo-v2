-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "totalGamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "totalLosses" INTEGER NOT NULL DEFAULT 0,
    "totalWagered" TEXT NOT NULL DEFAULT '0',
    "totalWon" TEXT NOT NULL DEFAULT '0',
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "classicGamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "classicWins" INTEGER NOT NULL DEFAULT 0,
    "classicLosses" INTEGER NOT NULL DEFAULT 0,
    "classicWagered" TEXT NOT NULL DEFAULT '0',
    "classicWon" TEXT NOT NULL DEFAULT '0',
    "classicBestTime" INTEGER,
    "rapidGamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "rapidWins" INTEGER NOT NULL DEFAULT 0,
    "rapidLosses" INTEGER NOT NULL DEFAULT 0,
    "rapidWagered" TEXT NOT NULL DEFAULT '0',
    "rapidWon" TEXT NOT NULL DEFAULT '0',
    "rapidBestTime" INTEGER,
    "achievements" TEXT[],

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameHistory" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "players" JSONB NOT NULL,
    "winner" TEXT NOT NULL,
    "loser" TEXT,
    "betAmount" TEXT NOT NULL,
    "payoutAmount" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "totalTurns" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_walletAddress_key" ON "UserProfile"("walletAddress");

-- CreateIndex
CREATE INDEX "UserProfile_totalWins_idx" ON "UserProfile"("totalWins");

-- CreateIndex
CREATE INDEX "UserProfile_classicWins_idx" ON "UserProfile"("classicWins");

-- CreateIndex
CREATE INDEX "UserProfile_rapidWins_idx" ON "UserProfile"("rapidWins");

-- CreateIndex
CREATE UNIQUE INDEX "GameHistory_roomId_key" ON "GameHistory"("roomId");

-- CreateIndex
CREATE INDEX "GameHistory_mode_idx" ON "GameHistory"("mode");

-- CreateIndex
CREATE INDEX "GameHistory_winner_idx" ON "GameHistory"("winner");

-- CreateIndex
CREATE INDEX "GameHistory_createdAt_idx" ON "GameHistory"("createdAt");
