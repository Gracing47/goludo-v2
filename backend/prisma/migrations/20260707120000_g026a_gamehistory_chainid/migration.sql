-- G-026a: chain-scope match history. Additive, no drop, no data loss
-- (G-024 standard): existing rows default to Coston2 (114).
ALTER TABLE "GameHistory" ADD COLUMN "chainId" INTEGER NOT NULL DEFAULT 114;

-- Query pattern: per-chain stats & leaderboards (G-026b)
CREATE INDEX "GameHistory_chainId_idx" ON "GameHistory"("chainId");
