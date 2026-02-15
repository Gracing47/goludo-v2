# Sprint 2: GoLudo V2 — Big Bang

## Goal
Rebuild backend with proper architecture: Game Mode system (Classic + Rapid), Redis state persistence, PostgreSQL profile system. Strategy Pattern, layered architecture (Controller→Service→Repository), server authority.

## Tasks

- [ ] **Task 1: Game Mode types + Strategy interface** → Create `backend/engine/GameMode.ts` with `IGameMode` interface, `ClassicMode`, `RapidMode`. Verify: unit test both modes initialize correctly
- [ ] **Task 2: Adapt `gameLogic.ts` to be mode-aware** → `createInitialState()` accepts mode param, `checkWinCondition()` delegates to strategy. Verify: existing engine tests still pass + new mode tests
- [ ] **Task 3: Redis client + GameStateManager** → `backend/db/redisClient.ts` + `backend/services/stateManager.ts`. Singleton, `saveRoom()`, `getRoom()`, `deleteRoom()`, checkpoint every 10 turns. Verify: `node -e` script saves/loads room
- [ ] **Task 4: Replace `activeRooms[]` in server.ts** → All room CRUD through `GameStateManager`. Remove in-memory array. Verify: create room via API, check Redis has it
- [ ] **Task 5: PostgreSQL + Prisma schema** → `npx prisma init`, schema with `UserProfile` (mode-specific stats) + `GameHistory`. Verify: `npx prisma migrate dev` succeeds
- [ ] **Task 6: ProfileManager service** → `backend/services/profileManager.ts`. `getOrCreateProfile()`, `updateStats()`, `saveGameHistory()`, `getLeaderboard()`. Verify: unit test profile CRUD
- [ ] **Task 7: API routes extraction** → `backend/routes/profile.ts`, `backend/routes/health.ts`. Register in server.ts. Verify: `curl /api/profile/0x...` returns profile, `curl /health` returns Redis+DB status
- [ ] **Task 8: Integration in server.ts** → Wire stateManager + profileManager into game_ended handler. Stats updated on win/loss. Verify: play full game, check DB has correct stats
- [ ] **Task 9: Validation + Zod schemas** → Add mode field to `createRoomSchema`, `joinRoomSchema`. Verify: invalid mode rejected with 400

## Done When
- [ ] Classic + Rapid modes initialize with correct token positions
- [ ] Redis stores all game state (no in-memory rooms)
- [ ] Server restart recovers active games from Redis
- [ ] Profile stats tracked per mode (classicWins, rapidWins)
- [ ] Leaderboard API returns sorted results
- [ ] Health endpoint shows Redis + DB green
- [ ] `vite build` passes (frontend unchanged)
