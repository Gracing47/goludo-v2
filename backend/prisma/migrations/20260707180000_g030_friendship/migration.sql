-- G-030: friendship social graph. Additive, no data loss (G-024 standard).
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "addrLow" TEXT NOT NULL,
    "addrHigh" TEXT NOT NULL,
    "requester" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "blockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Friendship_addrLow_addrHigh_key" ON "Friendship"("addrLow", "addrHigh");
CREATE INDEX "Friendship_addrLow_idx" ON "Friendship"("addrLow");
CREATE INDEX "Friendship_addrHigh_idx" ON "Friendship"("addrHigh");
CREATE INDEX "Friendship_status_idx" ON "Friendship"("status");
