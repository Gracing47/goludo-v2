# 🔒 INSIDE-TICKET — AAA-Audit goludo-v2

> **⚠️ INTERN / DRAFT — NICHT Teil des formalen Ticket-Systems.**
> Dieses Dokument ist ein internes Tracking-Ticket („Inside-Ticket"), bewusst getrennt von `docs/` (formale Audits) und dem `.agent/{task-slug}.md`-Flow abgelegt, damit nichts verwechselt wird. Es dient als referenzierbare Grundlage, wenn die Findings später vollständig in das Projekt-/Ticket-System integriert werden.
>
> **Referenzierung:** Jedes Finding hat eine stabile ID (`AAA-C#`, `AAA-H#`, `AAA-M#`, `AAA-L#`). Diese IDs sind stabil und können in Commits/PRs/Tasks zitiert werden.

| Feld | Wert |
|------|------|
| **Audit-Typ** | Multi-Agent AAA-Readiness-Audit (9 Subsysteme, adversarial verifiziert) |
| **Persona** | „Daniel" (Dev Bible + Game Engine Stack) |
| **Datum** | 2026-06-22 |
| **Methode** | 50 Agents · 110 Findings · 40 Critical/High adversarial geprüft → 36 bestätigt, 4 widerlegt |
| **Overall Health** | **44 / 100** |
| **Findings** | 🔴 5 Critical · 🟠 35 High · 🟡 51 Medium · ⚪ 19 Low |

---

## 🎯 Verdict

> Not launch-ready: a single signer key can drain the entire vault on-chain, live games freeze on any deploy, and the money-handling UI is untyped and untested — this is a promising testnet prototype, not an AAA real-money product.

### Executive Summary

goludo-v2 is a genuinely ambitious, visually polished staked Ludo game with a few real architectural strengths — a single shared rules engine imported by both client and server (backend/server.ts:16), server-authoritative cryptographically-secure dice (randomInt(1,7) at server.ts:675), server-validated moves, EIP-712 payouts with per-room nonces/deadlines and CEI ordering, and a clean Zustand store/routing shell. But measured against an AAA bar — locked 60fps, robust authoritative netcode, secure on-chain stakes, strict TypeScript, real test coverage — it is not close, and it has at least one finding that is outright disqualifying for real-money launch.

The single most dangerous issue is verified in code: LudoVault.claimPayout (smart-contracts/contracts/LudoVault.sol:253-254) computes fee/payout from a signer-supplied `amount` with NO on-chain invariant tying it to the room's own pot — there is no `require(amount <= room.pot)`. A compromised or buggy signer can sign `amount = entire vault balance` and drain every room's funds. There is no Pausable, no circuit breaker, emergencyWithdraw only covers ACTIVE rooms (line 269) so a never-filled WAITING room locks joiners' stakes, and dice are fully server-trusted with no commit-reveal/VRF — the same entity controls both dice and payouts. On the server, all authoritative state and turn timers live in a single in-memory process (activeRooms array server.ts:106, activeTurnTimers Map server.ts:215): it cannot scale horizontally, a deploy/crash mid-match loses turn timers and can permanently freeze a staked game (locking the pot), and Socket.IO game events (roll_dice/move_token/join_match) have zero rate limiting or auth — join_match calls socket.join(roomId) before any participant check (server.ts:576), leaking opponents' positions. The strict-TypeScript claim is a facade: tsconfig include is ["src"] with no allowJs, so App.jsx (771 lines), Lobby.jsx (726 lines) and the rest of the money-handling .jsx are never type-checked. Tests are broken on arrival — signer.test.js imports ../signer.js while the module is at services/signer.js, and the backend runs jest (package.json) against ESM/.ts + vitest's vi. Audio ships only synth beeps (SoundManager.play() jumps to playSynth, never touching the mapped .mp3 assets), and the per-hop whole-object setGameState in App.jsx will not hold 60fps with 16 framer-motion nodes.

Bottom line: the foundation is salvageable and several instincts are correct, but fund-safety, server authority, type coverage, and the test suite all need to be fixed before this can be called AAA — and before it should touch real money on mainnet.

---

## 📊 Subsystem-Scoreboard

| Subsystem | Health | Findings | Kurzbefund |
|-----------|:------:|:--------:|------------|
| testing-and-continuity | 🔴 34 | 12 | The test suite is broad on paper but largely non-functional and shallow in practice. The backend test directory mixes Jest and Vitest idioms in a way that canno… |
| lobby-and-pages | 🔴 42 | 12 | The lobby-and-pages layer works for the happy path but falls well short of AAA standards. Lobby.jsx is a 727-line untyped monolith that fuses menu state, HTTP p… |
| react-components | 🔴 48 | 13 | The React component layer is visually ambitious and accessibility-aware (ARIA labels on Dice/Token, keyboard handlers, sr-only live regions), and the routing/la… |
| game-engine | 🟡 52 | 12 | The headless engine is a reasonably clean, mostly-pure rules core with a single shared source of truth: the same `src/engine/gameLogic.ts` is imported by both t… |
| state-and-hooks | 🟡 52 | 12 | The Zustand store layer is clean, well-documented, and uses atomic + useShallow selectors correctly, which is a solid foundation. However the custom-hook layer … |
| backend-server | 🟡 52 | 15 | The backend is more authoritative than typical hobby Ludo servers: the server computes valid moves and rolls dice with crypto.randomInt, so clients cannot injec… |
| web3-and-contracts | 🟡 52 | 12 | The on-chain escrow (LudoVault) is reasonably structured — it uses OpenZeppelin ReentrancyGuard, Ownable2Step, EIP-712 typed signatures with per-room nonces, de… |
| audio-vfx-juice | 🟡 52 | 12 | The subsystem has a genuinely impressive surface polish: a large hand-authored library of CSS animations (token hop, float, shimmer, glow-pulse, board shake, la… |
| build-config-types | 🟡 58 | 10 | TypeScript strict mode is genuinely ON and aggressively configured (strict, noImplicitAny via strict, strictNullChecks via strict, noUncheckedIndexedAccess, exa… |

---

## 🚨 Top-Risiken

**1. claimPayout pays an unbounded signer-controlled amount — entire vault is drainable** `critical`

> LudoVault.sol:253-254 derives fee/payout from the signed `amount` with no `require(amount <= room.pot)`. One leaked/buggy signer key drains funds across ALL rooms, not just one. This is a single-point total-loss vector on mainnet and is disqualifying by itself.

**2. No pause / circuit breaker on a fund-holding contract** `critical`

> LudoVault has no OpenZeppelin Pausable. If the drain bug above is being actively exploited or the signer leaks, the owner cannot halt deposits/payouts while migrating. Standard audit-blocker for money-holding mainnet contracts.

**3. All authoritative state + turn timers are single-process in-memory** `critical`

> activeRooms (server.ts:106) and activeTurnTimers (server.ts:215) live in one Node process: not horizontally scalable, no Socket.IO Redis adapter, and a crash/deploy mid-match drops turn timers so a recovered ACTIVE room has no AFK/forfeit enforcement — the staked pot can lock forever and never reach WIN, so no payout signature is ever issued.

**4. Socket.IO game events are unauthenticated and unthrottled** `high`

> join_match calls socket.join(roomId) before verifying the address is a participant (server.ts:576), so an attacker subscribes to any staked game's state_update broadcasts (opponent positions). roll_dice/move_token/join_match have no rate limiting (limiters exist only for Express routes 133-153), enabling event-loop DoS.

**5. Dice for real-money games are fully server-trusted with no provable fairness** `high`

> server.ts:675 uses crypto.randomInt — unpredictable to outsiders but the server that controls dice also signs payouts. A compromised/colluding backend can bias rolls toward a chosen address then sign its payout. No commit-reveal, no Flare VRF. This is the core trust problem of on-chain wagering.

**6. Strict TypeScript is a facade over the money-handling UI** `high`

> tsconfig include is ['src'] with no allowJs/checkJs, so App.jsx (771 lines), Lobby.jsx (726 lines) and VictoryCelebration.jsx — which run the game loop, matchmaking, stake math and web3 payout claim — are never type-checked. Wrong-typed stakes or state shapes fail only at runtime, mid-match or mid-payout.

**7. The test suite cannot run and the money paths are unverified** `high`

> backend/__tests__/signer.test.js imports ../signer.js but the module is at services/signer.js (dead import); the backend 'test' script runs jest against ESM/.ts using vitest's vi. The only payout-signing/verification tests are dead on arrival, and there is no asserting test for secure dice, EIP-712 domain correctness, or full settlement.

**8. Per-hop whole-object setGameState will not hold 60fps** `high`

> App.jsx commits one setGameState per animation hop, re-deriving all tokens and re-running framer-motion layout/FLIP on up to 16 nodes per frame, plus infinite glow loops and DOM-node confetti (50 nodes) animating non-compositor properties — fails the locked-60fps AAA bar on mid-tier mobile.

---

## ⚡ Quick Wins (High-Impact / Low-Effort)

1. Add `require(amount <= room.pot)` (ideally `amount == room.pot`) at the top of claimPayout (LudoVault.sol:253) and pay fee+payout from room.pot only — caps a signer compromise to a single room's pot instead of the whole vault. Small diff, enormous blast-radius reduction.
2. Set `sourcemap: false` (or 'hidden') in vite.config.ts:68 so the deployed dist stops shipping full readable source (web3/anti-cheat logic) to every attacker's devtools.
3. In join_match (server.ts:576), move socket.join(roomId) to AFTER the participant lookup succeeds and reject non-participants — stops the opponent-position information leak with a 3-line guard.
4. Make txHash REQUIRED for staked rooms in createRoomSchema/validation.js and hard-fail (process.exit) in production when RPC/vault env are unconfigured instead of degrading contractVerifier to return true — closes the trust-the-client matchmaking hole.
5. Fix the backend test imports (../signer.js -> ../services/signer.js, same for contractVerifier) and switch the backend test script to `vitest run`; delete jest.config.js. Gets the money-path tests resolving so CI can start asserting.
6. Remove the VITE_ prefix from VITE_DEEPSEEK_API_KEY in .env.example and proxy DeepSeek via the existing Node backend — kills the client-bundle secret-leak footgun.
7. Remove hardcoded contract-address fallbacks in src/config/web3.ts and throw on missing VITE_LUDOVAULT_ADDRESS/VITE_GOTOKEN_ADDRESS at startup — prevents silently binding to the wrong vault for staked play.
8. Decide the blockade rule: either set BLOCKADE_STRICT true (constants.ts:106) with tests, or delete the blockade fields so classicRules stops advertising blockadesEnabled=true while the engine ignores it.

---

## 🔴 Critical Findings (Detail)

### AAA-C1 — All authoritative game state + turn timers are single-process in-memory — not horizontally scalable  `✅ bestätigt`

- **Subsystem:** backend-server
- **Datei:** `backend/server.ts` @ line 106 `let activeRooms` and line 215 `activeTurnTimers`
- **Kategorie:** architecture
- **Evidenz:** `let activeRooms: BackendRoom[] = [];` is the sole source of truth for live games, and `const activeTurnTimers = new Map<string, any>();` holds setTimeout handles. All handlers do `activeRooms.find(r => r.id === ...)`. Socket.IO has no Redis adapter configured (`new Server(server, { cors, pingInterval, pingTimeout })` only).
- **Impact:** The server can only run as a single instance. Two instances would split rooms, route sockets to the wrong process, and run divergent turn timers — games would desync or freeze. This caps concurrency at one Node process and makes zero-downtime deploys impossible without dropping every live match.
- **Fix:** Move authoritative room state into Redis (you already have GameStateManager) as the single source of truth, add `@socket.io/redis-adapter` so io.to(room) fans out across instances, and externalize turn deadlines (store turnExpiresAt in Redis + a single sweeper or BullMQ delayed job) instead of per-process setTimeout. Make handlers read-modify-write Redis with optimistic locking/WATCH on a per-room key.

### AAA-C2 — Live turn timers and in-flight turn state are lost on crash/restart — staked games can freeze permanently  `✅ bestätigt`

- **Subsystem:** backend-server
- **Datei:** `backend/server.ts` @ server.listen recovery block lines 1093-1139; startTurnTimer lines 309-357
- **Kategorie:** bug
- **Evidenz:** On boot the server recovers rooms (`stateManager.recoverState()`) and pushes them into activeRooms, but NOTHING re-arms turn timers for ACTIVE rooms. `activeTurnTimers` starts empty and is only populated by startTurnTimer, which is called from handleNextTurn/roll/move — never from recovery. There is also no saveCheckpoint() call anywhere in server.ts despite the checkpoint API existing.
- **Impact:** If the process restarts mid-game (deploy, crash, OOM), recovered ACTIVE rooms have no running timer. The active player can stall forever with no AFK/forfeit enforcement; if that player never returns, the staked pot is locked and the game never reaches WIN, so no payout signature is ever issued. This is a funds-locking failure.
- **Fix:** After recovery, for every ACTIVE room call handleNextTurn() (or recompute turnExpiresAt and re-arm) to restart enforcement. Persist turnExpiresAt to Redis on every broadcast (already partly done) and on boot resume timers from the remaining time. Add the missing saveCheckpoint() calls so a recoverable snapshot actually exists.

### AAA-C3 — claimPayout pays an unbounded signer-controlled `amount`, not the room's pot — entire vault can be drained  `✅ bestätigt`

- **Subsystem:** web3-and-contracts
- **Datei:** `smart-contracts/contracts/LudoVault.sol` @ claimPayout, lines 217-265 (esp. 253-262)
- **Kategorie:** security
- **Evidenz:** uint256 fee = (amount * feeBps) / BPS_DENOMINATOR; uint256 payout = amount - fee; room.pot = 0; ... (bool wSuccess, ) = payable(winner).call{value: payout}(""); — `amount` is taken from the signed message and is NEVER checked against room.pot or room.entryAmount * participants.length. The contract sets room.pot = 0 but pays `amount`, which may exceed that room's pot.
- **Impact:** If the server signer key is compromised, or the signer has any bug, it can sign amount = entire vault balance for a 1-wei room and drain funds belonging to all other rooms. Even honestly, there is zero on-chain invariant guaranteeing solvency per-room; the contract relies entirely on the off-chain signer to never over-sign. This is a single-point fund-loss vector for real stakes on Flare mainnet.
- **Fix:** Enforce on-chain that payout cannot exceed the room's own funds: require `amount <= room.pot` (ideally amount == room.pot) before computing fee/payout. Pay `payout` and `fee` from room.pot only. This caps the blast radius of a signer compromise to a single room's pot rather than the whole vault.

### AAA-C4 — Backend signer/contractVerifier tests import non-existent paths — they cannot run  `✅ bestätigt`

- **Subsystem:** testing-and-continuity
- **Datei:** `backend/__tests__/signer.test.js` @ line 2 (and contractVerifier.test.js line 1)
- **Kategorie:** testing
- **Evidenz:** signer.test.js: `import { signPayout } from '../signer.js';` and contractVerifier.test.js: `import * as contractVerifier from '../contractVerifier.js';`. The actual modules are at backend/services/signer.js and backend/services/contractVerifier.js (confirmed via glob). From backend/__tests__/, `../signer.js` resolves to backend/signer.js, which does not exist.
- **Impact:** The ONLY tests covering payout signing (fund release) and on-chain room/stake verification are dead on arrival — they throw a module-resolution error before any assertion runs. The entire money-handling layer has effectively zero working test coverage, while prior audits marked signer.test.js and contractVerifier.test.js as passing.
- **Fix:** Fix imports to '../services/signer.js' and '../services/contractVerifier.js'. Add a CI step that fails the build if any test file errors at import time (vitest/jest both exit non-zero on unresolved imports, so simply wiring `npm test` into CI would have caught this).

### AAA-C5 — Backend test runner is misconfigured: Jest with no transform vs ESM/.ts imports and Vitest's vi  `✅ bestätigt`

- **Subsystem:** testing-and-continuity
- **Datei:** `backend/jest.config.js` @ jest.config.js line 3 `transform: {}`; contractVerifier.test.js line 2; connection.test.js line 2
- **Kategorie:** testing
- **Evidenz:** package.json `"test": "... jest"` runs Jest with `transform: {}` (no Babel/ts-jest). But connection.test.js does `import { server, io } from '../server.ts';` (TypeScript), and contractVerifier.test.js does `import { vi } from 'vitest';` then `vi.spyOn(...)`. Jest does not provide `vi`, and with transform:{} it cannot import a `.ts` file. A competing backend/vitest.config.ts also exists, so the runner is ambiguous.
- **Impact:** Running the documented `npm test` in backend either errors on the `.ts` import, on `Cannot find module 'vitest'` semantics, or on `vi is not defined`. The backend test suite does not pass as configured, contradicting the audit-plan verification criterion 'Alle Tests (npm run test) sind grün' and both prior audits' green checkmarks.
- **Fix:** Pick one runner. Standardize on Vitest (already present, handles .ts + vi natively): delete jest.config.js/jest.setup.js or convert them, set backend `"test": "vitest run"`, and move jest.setup.js env vars into a Vitest setupFile. Then make CI run it.

---

## 🟠 High Findings

| ID | Subsystem | Titel | Datei | Verdict | Aufw. |
|----|-----------|-------|-------|:-------:|:-----:|
| AAA-H1 | game-engine | Blockade subsystem is globally disabled - a core USA-Ludo rule does nothing | `src/engine/constants.ts:RULES.BLOCKADE_STRICT (line 106)` | ✅ bestätigt | ? |
| AAA-H2 | game-engine | Bonus-on-six and capture/home bonus can both fire, double-rewarding a single move | `src/engine/gameLogic.ts:completeMoveAnimation (lines 200-234)` | ✅ bestätigt | ? |
| AAA-H3 | state-and-hooks | useGameSocket connect() callback re-creates the entire socket connection on every dependency change | `src/hooks/useGameSocket.ts:connect useCallback deps, lines 41-350; consumed in App.jsx:216 socketConnect()` | ❌ widerlegt | M |
| AAA-H4 | state-and-hooks | connect()'s returned cleanup function is never wired to anything — socket teardown relies only on a coarse unmount effect | `src/hooks/useGameSocket.ts:connect returns cleanup at lines 345-349; unmount effect lines 353-359` | 🟡 teilw. bestätigt | M |
| AAA-H5 | state-and-hooks | Optimistic local animation and server state_update can animate the same token twice (double-hop / teleport race) | `src/hooks/useGameSocket.ts:state_update handler lines 118-208; App.jsx executeMove lines 297-374` | ❌ widerlegt | L |
| AAA-H6 | state-and-hooks | Zero test coverage for every store and hook in this subsystem | `src/store/useGameStore.ts:whole subsystem; only src/engine/__tests__ exists` | ✅ bestätigt | L |
| AAA-H7 | react-components | App.jsx is a 771-line untyped monolith owning the entire game loop, animation scheduler, netcode, web3 payout, persistence and audio | `src/App.jsx:whole file; executeMove (297-374), handleRoll (261-294), payout effect (429-461)` | 🟡 teilw. bestätigt | XL |
| AAA-H8 | react-components | Money-handling and most-complex components are .jsx and fully excluded from the strict TypeScript checker (no allowJs) | `tsconfig.json:compilerOptions (no allowJs); affects src/App.jsx, src/components/Lobby.jsx, src/components/VictoryCelebration.jsx` | ✅ bestätigt | XL |
| AAA-H9 | react-components | Per-hop setGameState mutates the whole state object, forcing full token re-derivation and framer-motion layout reflow every animation frame | `src/App.jsx:executeMove animation loop (321-330) + useGameStateDerivation dep on whole gameState (104)` | 🟡 teilw. bestätigt | L |
| AAA-H10 | lobby-and-pages | Web3 matchmaking uses HTTP polling instead of the existing Socket.IO channel | `src/components/Lobby.jsx:useEffect lines 82-116, fetchRooms` | 🟡 teilw. bestätigt | ? |
| AAA-H11 | lobby-and-pages | Browser refresh during a Web3 game loses config and drops player into a blank/desynced room | `src/pages/GameRoom.tsx:lines 50-72 (resume logic) + App.jsx lines 223-232 (persistence)` | 🟡 teilw. bestätigt | ? |
| AAA-H12 | lobby-and-pages | Lobby.jsx is a 727-line untyped monolith mixing UI, polling, and Web3 orchestration | `src/components/Lobby.jsx:whole file (.jsx, no types)` | ✅ bestätigt | ? |
| AAA-H13 | lobby-and-pages | No tests cover the lobby, routing, or any page | `src/components/Lobby.jsx:subsystem-wide (also GameRoom.tsx, LudoLobby.tsx, AppRouter.tsx, routes.ts)` | ✅ bestätigt | ? |
| AAA-H14 | backend-server | Socket.IO game events (roll_dice, move_token, join_match) have NO rate limiting or payload validation | `backend/server.ts:socket handlers lines 569, 646, 706` | ✅ bestätigt | ? |
| AAA-H15 | backend-server | server.ts is a 1141-line god-file with no separation of concerns | `backend/server.ts:entire file` | ✅ bestätigt | ? |
| AAA-H16 | backend-server | Forfeit winner detection uses activeColors.find() — wrong/undefined winner in multi-player games | `backend/server.ts:handlePlayerSkip lines 242-244` | 🟡 teilw. bestätigt | ? |
| AAA-H17 | backend-server | Reconnect mid-turn can double-arm or fail to resume the turn timer | `backend/server.ts:join_match handler lines 608-621` | ❌ widerlegt | ? |
| AAA-H18 | backend-server | Pot amount for payout signature is read from contract but never cross-checked against expected stake | `backend/server.ts:payout/sign handler lines 903-908` | 🟡 teilw. bestätigt | ? |
| AAA-H19 | backend-server | No automated tests for the turn state machine, payout authorization, or recovery | `backend/server.ts:whole subsystem` | ❌ widerlegt | ? |
| AAA-H20 | web3-and-contracts | No pause / circuit breaker — a discovered exploit or compromised signer cannot be stopped | `smart-contracts/contracts/LudoVault.sol:whole contract (no Pausable, no emergency stop on deposits/payouts)` | 🟡 teilw. bestätigt | ? |
| AAA-H21 | web3-and-contracts | WAITING rooms that never fill lock player funds — emergencyWithdraw only covers ACTIVE rooms, and only the creator can cancel | `smart-contracts/contracts/LudoVault.sol:cancelRoom (191-211) requires WAITING + msg.sender==creator; emergencyWithdraw (267-286) requires status==ACTIVE` | ✅ bestätigt | ? |
| AAA-H22 | web3-and-contracts | Dice RNG for real-money games is fully server-trusted — not provably fair, no commit-reveal or on-chain randomness | `backend/server.ts:roll_dice handler, line 675` | ✅ bestätigt | ? |
| AAA-H23 | web3-and-contracts | Single hot signer key with no rotation/HSM; signed payout deadline is 24h (large replay/exposure window) | `backend/services/signer.js:lines 19-31, 46` | 🟡 teilw. bestätigt | ? |
| AAA-H24 | web3-and-contracts | On-chain verification can be silently disabled; SKIP_VERIFICATION and missing env vars degrade to trust-the-client | `backend/services/contractVerifier.js:lines 52-100, 117-125, 206-214` | ✅ bestätigt | ? |
| AAA-H25 | audio-vfx-juice | Mapped MP3 sound assets are never played — entire HTMLAudio SFX path is dead code, only synth beeps ship | `src/services/SoundManager.ts:play() lines 37-47; soundMap lines 19-26` | ✅ bestätigt | L |
| AAA-H26 | audio-vfx-juice | AudioContext created in constructor at module load — starts 'suspended', risks no-audio-on-first-gesture | `src/services/SoundManager.ts:constructor lines 29-31; module singleton line 329` | ✅ bestätigt | M |
| AAA-H27 | audio-vfx-juice | framer-motion VFX ignore prefers-reduced-motion entirely | `src/components/ParticleEffects.jsx:VictoryConfetti lines 149-214; CaptureExplosion lines 67-144; AmbientLight.jsx 29-66; VictoryCelebration.jsx 127-140` | ✅ bestätigt | M |
| AAA-H28 | audio-vfx-juice | Confetti/particles animate non-compositor properties and stack heavy box-shadow blur — 60fps mobile risk | `src/components/ParticleEffects.jsx:explosion-particle boxShadow line 137; VictoryConfetti 50 nodes lines 154/165-193; winner-glow infinite line 197-208` | 🟡 teilw. bestätigt | L |
| AAA-H29 | build-config-types | Strict TS config is a facade: core game UI is untyped .jsx never seen by the type checker | `tsconfig.json:compilerOptions (no allowJs/checkJs) + include: ["src"]` | ✅ bestätigt | XL |
| AAA-H30 | build-config-types | Production source maps leak full readable source for a real-money on-chain game | `vite.config.ts:build.sourcemap (line 68)` | 🟡 teilw. bestätigt | S |
| AAA-H31 | build-config-types | Client-exposed VITE_DEEPSEEK_API_KEY secret footgun in .env.example | `.env.example:VITE_DEEPSEEK_API_KEY (line 14)` | 🟡 teilw. bestätigt | M |
| AAA-H32 | build-config-types | Contract address fallbacks in web3.ts conflict with .env.example for a staked game | `src/config/web3.ts:GO_TOKEN_ADDRESS / LUDO_VAULT_ADDRESS (lines 65-66)` | ✅ bestätigt | M |
| AAA-H33 | testing-and-continuity | RNG fairness test asserts a 'Bag System' that does not exist in the engine | `scripts/test_rng.js:lines 9, 28-35` | ✅ bestätigt | ? |
| AAA-H34 | testing-and-continuity | Signer test never recovers the signer or validates the EIP-712 domain — only checks string length | `backend/__tests__/signer.test.js:lines 17-24` | ✅ bestätigt | ? |
| AAA-H35 | testing-and-continuity | Server-side secure dice (the money path) and full payout settlement have zero tests | `backend/server.ts:line 675 const secureDiceValue = randomInt(1, 7); roll_dice handler ~646-701` | 🟡 teilw. bestätigt | ? |

<details><summary>High-Findings — Impact &amp; Fix (ausklappen)</summary>

**AAA-H1 — Blockade subsystem is globally disabled - a core USA-Ludo rule does nothing**  
- Impact: Stacked-token blockades - a defining strategic mechanic of standard Ludo - are completely inert. Two tokens on one square neither block movement nor stop captures. classicRules.ts advertises `blockadesEnabled = true` and `isBlockadeAllowed()` returns true, directly contradicting the engine's actual behavior, so any code trusting the rules object is wrong.  
- Fix: Decide the intended rule. If blockades are a feature, set BLOCKADE_STRICT true, add tests for spawn-blocked / path-blocked / capture-immunity-while-stacked, and reconcile with classicRules. If not, delete isBlockedByBlockade, BLOCKADE_SIZE, and the blockade fields from IGameRules so the code stops lying about itself.

**AAA-H2 — Bonus-on-six and capture/home bonus can both fire, double-rewarding a single move**  
- Impact: A player who rolls a 6, exits/advances, and captures gets BOTH a bonus move of CAPTURE_BONUS spaces AND (because consecutiveSixes>0) a fresh dice roll. That is not standard Ludo (a 6 grants one extra roll; a capture grants one bonus). Conversely, a capture bonus uses diceValue=20 (CAPTURE_BONUS) as literal step count, which is a nonsensical move distance, not the standard 'send-home + roll-again'. The bonus semantics are simply wrong.  
- Fix: Model turn continuation explicitly: a turn ends unless (rolled 6) OR (captured) OR (sent a token home), each granting exactly one extra roll. Do not reinterpret CAPTURE_BONUS/HOME_BONUS as a movement distance. Add tests asserting exactly one extra turn per qualifying event.

**AAA-H3 — useGameSocket connect() callback re-creates the entire socket connection on every dependency change**  
- Impact: Connection churn: dropped/re-established WebSockets mid-match, duplicate join_match emits, transient 'Connecting...' UI, and brief board resets. Under reconnect storms this multiplies. The store setters are stable (Zustand guarantees), but bundling them all into the dep array signals the lifecycle is not actually pinned to (roomId, address) as it should be.  
- Fix: Pin the socket lifecycle to a single effect keyed only on [roomId, account?.address]. Read all setters via useGameStore.getState() inside handlers (as the code already does for getState().state) instead of closing over them, so the connect identity is stable. Guard against re-connect when a live socket already matches _targetRoom/_targetAddr (the guard exists at lines 47-53 but connect itself is re-created, defeating it).

**AAA-H4 — connect()'s returned cleanup function is never wired to anything — socket teardown relies only on a coarse unmount effect**  
- Impact: Listeners and the local interval (localTimerId at line 211) are not torn down on room change, only on full unmount. Calling socketConnect() again disconnects the old socket (line 52) but the previous socket's registered handlers/timeouts/interval are orphaned until GC, and localTimerId from turn_timer_start is never cleared on socket replacement — a timer leak.  
- Fix: Manage the socket in a useEffect whose cleanup runs on dependency change, and explicitly clearInterval(localTimerId) plus socket.off()/removeAllListeners() in that cleanup. Do not rely on an imperative connect() whose cleanup return is thrown away.

**AAA-H5 — Optimistic local animation and server state_update can animate the same token twice (double-hop / teleport race)**  
- Impact: The mover can see their own token animate a second time when the authoritative echo lands, or snap if positions diverged. For captures/bonus (hopDuration 60ms) the timing window is tight and the watchdog (line 188) can fire mid-animation and force-sync. This is exactly the kind of jank that disqualifies AAA 'game feel'.  
- Fix: Make the server authoritative for animation too: emit the move first, render an optimistic ghost, and reconcile on echo by sequence/move id rather than diffing raw token arrays. Keep activeMovingToken set until the matching server echo is consumed (correlate by a move/seq id), not on a local timer.

**AAA-H6 — Zero test coverage for every store and hook in this subsystem**  
- Impact: The most bug-dense, concurrency-sensitive code (socket reconciliation, optimistic updates, timer lifecycle) has no regression net. Refactoring to fix the races above is high-risk without tests. Fails the 'real test coverage' AAA bar outright.  
- Fix: Add unit tests for selectors/derivation (pure), store reducers, and hook behavior using @testing-library/react renderHook + a mock socket.io-client. Prioritize a deterministic test of the state_update diff/animation reconciliation and the reconnect re-join path.

**AAA-H7 — App.jsx is a 771-line untyped monolith owning the entire game loop, animation scheduler, netcode, web3 payout, persistence and audio**  
- Impact: The game's turn loop and animation timeline live inside a React render function, coupled to web3, audio, and persistence. This is the core 'logic in a component' anti-pattern: untestable, fragile to re-render timing, and the hardest possible file to evolve toward authoritative netcode. Any refactor risks the staked-money payout path.  
- Fix: Extract the move/animation timeline into a framework-agnostic controller (e.g. a state machine / pure scheduler in src/engine or a custom hook) that emits frames; App should only render derived state and dispatch intents. Separate the web3 payout flow into its own hook. Target App.jsx under ~150 lines of pure composition.

**AAA-H8 — Money-handling and most-complex components are .jsx and fully excluded from the strict TypeScript checker (no allowJs)**  
- Impact: The strict config is largely theater: the files that move staked C2FLR funds and run the game loop get zero static safety. A typo'd field or wrong-typed stake fails only at runtime, potentially mid-match or mid-payout. ~43% of source files (8 jsx + 2 js of 44 component-ish files) are dark to the type system.  
- Fix: Migrate App.jsx, Lobby.jsx and VictoryCelebration.jsx to .tsx (highest value first, as they touch funds/state), and consume the existing GameState/GameConfig/Move types from src/types/index.ts. As an interim guard, enable allowJs+checkJs to surface the worst errors.

**AAA-H9 — Per-hop setGameState mutates the whole state object, forcing full token re-derivation and framer-motion layout reflow every animation frame**  
- Impact: During a single move, React re-renders App, re-derives all tokens, and framer-motion runs layout animations on up to 16 nodes per hop at hopDuration 60-150ms. Combined with token-glow-aura infinite loops and trail particles, this will not hold a locked 60fps on mid-tier mobile — the AAA bar. Animation is driven by React state changes rather than the compositor.  
- Fix: Drive the moving token's interpolation outside React state (a ref-based RAF animation or framer-motion's animate() on a single element), and only commit one setGameState at move completion. Narrow the derivation memo dependency to gameState.tokens, not the whole object. Consider transform-only animation to keep work on the GPU.

**AAA-H10 — Web3 matchmaking uses HTTP polling instead of the existing Socket.IO channel**  
- Impact: Up to 3s of latency before a player sees a new room or a joiner; wasted bandwidth (full room list re-fetched on a timer for every client); inherently racy room/color state that the code then has to patch around. This is the opposite of the 'robust authoritative netcode' an AAA staked game needs — lobby presence should be event-pushed over the socket.  
- Fix: Move lobby/room presence onto Socket.IO (rooms:list, room:updated, room:player_joined events) so updates are pushed authoritatively. Reserve REST for the initial snapshot. This also eliminates the re-fetch-before-join hack.

**AAA-H11 — Browser refresh during a Web3 game loses config and drops player into a blank/desynced room**  
- Impact: A staked player who refreshes (or shares the /game/:roomId URL) re-enters with config=null. App.jsx then does `if (!gameConfig) setGameConfig({ mode: 'web3', roomId })` losing their player color/index, board rotation, and name — they may be unable to identify their tokens or take a turn in a game where real funds are at stake. No loading or error state is shown for this case.  
- Fix: Either persist a minimal web3 resume record (roomId, myAddress, color, index) to localStorage, or rehydrate full lobby state from the server on socket reconnect keyed by wallet address. Show an explicit 'Reconnecting to match…' state instead of guessing.

**AAA-H12 — Lobby.jsx is a 727-line untyped monolith mixing UI, polling, and Web3 orchestration**  
- Impact: No compile-time safety on the most money-adjacent UI flow (stake amounts, room/player shapes are all `any`). High coupling makes the matchmaking flow hard to test or change; the 'waiting' branch even shadows the outer `playerCount` state with a local const (line 431), a footgun. This is the single biggest maintainability gap versus AAA 'clean, strict-TS architecture'.  
- Fix: Convert to .tsx with typed Room/Player models, extract a useMatchmaking hook (polling/socket + create/join), and split menu/lobby/waiting/setup/JoinModal into separate presentational components.

**AAA-H13 — No tests cover the lobby, routing, or any page**  
- Impact: The most race-prone, funds-adjacent UI (create/join staked rooms, color conflict, resume) has no regression safety net. AAA standard is real coverage of exactly these state machines and edge cases.  
- Fix: Add component/integration tests (vitest + Testing Library) for the lobby step machine, join-race color reassignment, and GameRoom routing/resume branches; add a typed mock of the rooms API.

**AAA-H14 — Socket.IO game events (roll_dice, move_token, join_match) have NO rate limiting or payload validation**  
- Impact: A malicious or buggy client can flood move_token/roll_dice/join_match. join_match in particular does `socket.join(roomId)` and a linear scan of activeRooms with no auth — an attacker can join arbitrary room channels and receive state_update broadcasts for games they are not in (information leak of opponents' positions in a staked game), and spam emits to exhaust CPU/event loop.  
- Fix: Add a per-socket token-bucket rate limiter (e.g. a Map of socketId->timestamps or rate-limiter-flexible) on every game event. Validate socket payloads with the same zod schemas. On join_match, verify the address belongs to a player in that room before socket.join, and reject otherwise.

**AAA-H15 — server.ts is a 1141-line god-file with no separation of concerns**  
- Impact: Untestable in isolation, high merge-conflict surface, and easy to introduce turn-state regressions (the file already carries inline FIX/CRITICAL comments documenting prior breakage). This is the opposite of the clean, maintainable architecture AAA requires.  
- Fix: Decompose into: a transport layer (socket handler registration), a GameEngine/TurnController service holding the state machine, a RoomService over Redis, route modules (rooms.ts, payout.ts), and a separate TimerService. Inject io rather than passing it through every function. Target <300 lines per module with unit tests on the TurnController.

**AAA-H16 — Forfeit winner detection uses activeColors.find() — wrong/undefined winner in multi-player games**  
- Impact: In a 3-4 player game, the logged forfeit 'Winner' is arbitrary and misleading for the on-chain audit trail. More importantly the surrounding logic only declares a winner when exactly one color remains; the intermediate 'winner' computation is dead/incorrect and signals the forfeit accounting was not designed for >2 players, risking incorrect payout attribution if reused.  
- Fix: Remove the misleading winnerIdx guess. Only emit a winner when activeColors.length===1, and make the forfeit blockchain-event log state 'forfeited, game continues' for multi-player. Add explicit tests for 3- and 4-player forfeit cascades.

**AAA-H17 — Reconnect mid-turn can double-arm or fail to resume the turn timer**  
- Impact: Inconsistent turn deadlines on reconnect: a player who disconnects can effectively refresh their clock by reconnecting, or get a turn_timer_start with an already-expired timestamp causing immediate client-side timeout. Exploitable for stalling in staked games.  
- Fix: Make turn resumption deterministic: store {turnExpiresAt, phase, playerIndex} authoritatively; on reconnect, if now<turnExpiresAt emit the existing deadline, else immediately invoke the timeout path. Never silently restart the clock from a reconnect.

**AAA-H18 — Pot amount for payout signature is read from contract but never cross-checked against expected stake**  
- Impact: The server will sign a payout for whatever pot the contract returns without verifying the room is in the expected on-chain state or that the pot matches the game it actually adjudicated. A mismatch between off-chain game identity and on-chain pot (e.g. roomId collision, partial deposits, contract returning stale data) could produce a valid signature for an incorrect amount.  
- Fix: Validate contractRoom.status equals the expected 'full/active/settled' enum, assert potAmount is within [stake, stake*maxPlayers] of the off-chain room, and confirm the on-chain player set matches room.players before signing. Reject otherwise.

**AAA-H19 — No automated tests for the turn state machine, payout authorization, or recovery**  
- Impact: Every change to turn/forfeit/reconnect/payout logic is unverified. For a staked game this is unacceptable risk — a subtle turn-advance or winner-selection regression directly loses or misroutes funds.  
- Fix: Add unit tests for TurnController (timeout→skip→forfeit cascade, multi-player next-player, bonus moves), reconnect resumption, and payout authorization (reject non-WIN, wrong winner, pot bounds). Add an integration test that simulates a full 2- and 4-player game over a mock socket. Target the money/turn paths first.

**AAA-H20 — No pause / circuit breaker — a discovered exploit or compromised signer cannot be stopped**  
- Impact: If the signer key leaks or the amount bug above is being actively exploited, the owner has no way to halt new deposits or payouts while migrating. On a money-holding mainnet contract this is a standard AAA/audit requirement.  
- Fix: Add OpenZeppelin Pausable; gate createRoom/joinRoom (and optionally claimPayout) with whenNotPaused. Combine with a guardian role that can pause faster than a full owner multisig. Document an incident-response runbook (pause -> rotate signer -> resume).

**AAA-H21 — WAITING rooms that never fill lock player funds — emergencyWithdraw only covers ACTIVE rooms, and only the creator can cancel**  
- Impact: A non-creator who joined a 3- or 4-player room (paying entryAmount) is stuck if the room never reaches maxPlayers and the creator disappears or refuses to call cancelRoom. The room stays WAITING forever; emergencyWithdraw rejects it; the joiner cannot recover their stake. Funds are permanently locked. ROOM_TIMEOUT being declared-but-unused signals intended-but-missing timeout logic.  
- Fix: Allow any participant to trigger a refund on a WAITING room after ROOM_TIMEOUT (use the declared constant), or extend emergencyWithdraw to handle WAITING status. Add a test for a partially-filled room that times out.

**AAA-H22 — Dice RNG for real-money games is fully server-trusted — not provably fair, no commit-reveal or on-chain randomness**  
- Impact: For staked multiplayer on Flare, the entity that controls payouts also controls the dice with no auditability. A malicious or compromised backend can bias rolls toward a chosen player (e.g. the house, or a colluding account) and then sign that player's payout. 'crypto.randomInt' guarantees unpredictability to outsiders but provides zero fairness guarantee against the server itself. This is the core trust problem for on-chain wagering and the biggest gap vs a credible real-money game.  
- Fix: Move to verifiable randomness: use Flare's RNG/Secure Random oracle, or a commit-reveal scheme where each roll commits a server seed hash before the turn and reveals afterward, letting clients (and a dispute contract) verify dice = H(serverSeed, clientSeed, nonce). At minimum, log a per-roll seed chain that players can audit post-game.

**AAA-H23 — Single hot signer key with no rotation/HSM; signed payout deadline is 24h (large replay/exposure window)**  
- Impact: The signer key is the single authority that authorizes all payouts. With the amount-not-bounded bug above, leaking this env var = drain the vault. A 24h deadline means a signed payout proof, if intercepted, remains valid for a full day; combined with the fact that the on-chain nonce is only consumed on a successful claim, a leaked-but-unused proof is replayable for 24h.  
- Fix: Store the signer key in a KMS/HSM and sign via an API rather than holding raw bytes in process env. Shorten the deadline to minutes for claim proofs. Add owner-side signer rotation runbook. Separate testnet/mainnet keys. Consider a 2-of-3 signer or multisig oracle for mainnet.

**AAA-H24 — On-chain verification can be silently disabled; SKIP_VERIFICATION and missing env vars degrade to trust-the-client**  
- Impact: Although there is a production guard, the failure modes are dangerous: a try/catch around provider init flips VERIFICATION_ENABLED=false even in production (it only logs), after which verifyRoomCreation/Join return true unconditionally. Combined with the txHash-optional path in createRoomSchema/server.ts, a client can register lobby rooms that were never paid for, polluting matchmaking and potentially pairing a paying player against a non-paying one whose on-chain join never happened.  
- Fix: In production, hard-fail (process.exit) if RPC/vault are unconfigured rather than degrading to true. Make txHash REQUIRED for staked rooms (it is .optional() in validation.js). Never return true from a verifier when verification could not actually be performed in production.

**AAA-H25 — Mapped MP3 sound assets are never played — entire HTMLAudio SFX path is dead code, only synth beeps ship**  
- Impact: The game always plays placeholder synthesized beeps instead of real, mastered audio. This is the single biggest gap between this and an AAA 'feel'. The comment 'Premium AAA Quality' on playSynth is aspirational, not real.  
- Fix: Implement a real AudioBuffer pipeline: fetch+decodeAudioData each soundMap asset at init (or lazily on first use), cache the decoded buffers, and play via pooled AudioBufferSourceNodes routed through a master GainNode. Keep playSynth only as a graceful fallback when an asset 404s.

**AAA-H26 — AudioContext created in constructor at module load — starts 'suspended', risks no-audio-on-first-gesture**  
- Impact: First SFX (often the first dice roll) can be silent or glitched on Chrome/Safari autoplay policy, and on iOS the context may never unlock if the first play() doesn't coincide with a trusted gesture. There is no explicit one-time 'unlock on first pointerdown' handler.  
- Fix: Lazily create the AudioContext on the first user gesture, add a one-time global pointerdown/keydown listener that calls audioCtx.resume() (and plays a 0-gain buffer to unlock iOS). Await resume() before scheduling the first sound, or queue the sound until state==='running'.

**AAA-H27 — framer-motion VFX ignore prefers-reduced-motion entirely**  
- Impact: Users who set 'reduce motion' (vestibular disorders, photosensitivity) still get full-screen confetti, infinite pulsing glows, and 16-particle explosions. This is an accessibility failure and an AAA-polish failure.  
- Fix: Import framer-motion's useReducedMotion() and branch: skip confetti/explosions or replace with a single fade. Gate all 'repeat: Infinity' animations behind the hook.

**AAA-H28 — Confetti/particles animate non-compositor properties and stack heavy box-shadow blur — 60fps mobile risk**  
- Impact: On mid/low-end mobile, 50 simultaneously-animating DOM nodes plus a 16-particle glowing explosion (possibly several concurrent on multi-capture) plus infinite glow loops will drop well below 60fps. AAA requires a locked frame budget; DOM-node particle systems do not scale.  
- Fix: Move particle systems to a single <canvas> (or WebGL) with a pooled, frame-budgeted simulation; cap concurrent particles; drop box-shadow halos in favor of pre-baked radial-gradient sprites. At minimum reduce confetti count on touch devices and use transform/opacity only.

**AAA-H29 — Strict TS config is a facade: core game UI is untyped .jsx never seen by the type checker**  
- Impact: The most gameplay-critical components (board, tokens, dice, lobby) have NO type safety despite the project advertising 'AAA Quality Standards' strict typing. Null derefs, wrong prop shapes, and state-shape mismatches against the canonical GameState/Move types ship undetected. The strict flags create false confidence.  
- Fix: Migrate the .jsx files to .tsx (they already use JSX + the typed store/types). As an interim, set allowJs:false is fine but you must convert; do NOT just add allowJs:true (it lets JS in untyped). Add a CI gate: "tsc --noEmit" in the build/test pipeline so strict errors actually block deploys.

**AAA-H30 — Production source maps leak full readable source for a real-money on-chain game**  
- Impact: The deployed dist/ exposes complete original source (including web3 staking logic, EIP-712 flow expectations, anti-cheat hints) to anyone via devtools. For a staked multiplayer game this hands attackers a map of client-side validation to bypass and reveals payout/claim mechanics.  
- Fix: Set sourcemap to false for prod, or 'hidden' and upload maps privately to an error tracker (Sentry) then exclude them from the published dist. Gate on process.env.NODE_ENV.

**AAA-H31 — Client-exposed VITE_DEEPSEEK_API_KEY secret footgun in .env.example**  
- Impact: If a real DeepSeek key is ever placed here (the file invites it), it is shipped to every browser and trivially extracted from the bundle, leading to key theft and quota/billing abuse. The VITE_ prefix on a paid API key is a classic secret-leak pattern.  
- Fix: Remove the VITE_ prefix and proxy DeepSeek calls through the Node backend (which already exists). Never put third-party API keys behind VITE_. Add a lint/CI check that flags VITE_*_KEY/SECRET names.

**AAA-H32 — Contract address fallbacks in web3.ts conflict with .env.example for a staked game**  
- Impact: If the env var is ever missing/misnamed at build time, the client silently binds to a DIFFERENT vault/token contract than intended. For staked play this means deposits/claims could hit the wrong (or stale/abandoned) contract — direct fund-loss / 'where did my stake go' class of bug. The two sources of truth disagree, so one is already wrong.  
- Fix: Remove hardcoded address fallbacks entirely. Fail fast (throw) if VITE_LUDOVAULT_ADDRESS/VITE_GOTOKEN_ADDRESS are unset, like the project should for any money-handling config. Keep a single authoritative address registry per network, validated at startup.

**AAA-H33 — RNG fairness test asserts a 'Bag System' that does not exist in the engine**  
- Impact: The repo's only 'RNG fairness' artifact tests a feature that was never implemented and would report the real, correct engine as failing. It gives a false impression that dice distribution is governed/verified. Fairness of the money-relevant server dice (crypto.randomInt) is not assessed at all.  
- Fix: Delete or rewrite. For real fairness testing, run a chi-square goodness-of-fit on a large sample (e.g. 60k rolls) of the actual server path (randomInt(1,7)) with a proper p-value threshold, not a hardcoded deviation<=2. Test the engine that ships, not a phantom bag system.

**AAA-H34 — Signer test never recovers the signer or validates the EIP-712 domain — only checks string length**  
- Impact: A bug that produces a syntactically valid but cryptographically wrong signature (wrong chainId, wrong verifyingContract, wrong type ordering) passes this test, yet the on-chain claimPayout would revert with InvalidSignature — funds stuck or payout blocked. This is the exact class of error that loses/locks funds, and it is untested. The second test (line 27-30) is an empty stub with no assertion.  
- Fix: Reconstruct the typed-data digest in the test and assert ethers.verifyTypedData(domain, types, value, signature) === expected signer address. Add cases for tampered amount/winner/nonce to prove the signature binds them. Mirror the exact domain used by smart-contracts/test/LudoVault.test.js so signer and contract stay in lockstep.

**AAA-H35 — Server-side secure dice (the money path) and full payout settlement have zero tests**  
- Impact: The authoritative netcode and the entire stake-settlement pipeline (roll -> move -> capture -> win -> sign payout) are unverified by automated tests. For a real-money game this is the highest-risk surface and it relies entirely on manual testing. Connection/stress tests are smoke checks (connection liveness) that would pass even if every game action were broken.  
- Fix: Add integration tests that drive a full 2-player match over Socket.IO with deterministic dice (inject forcedValue or seed randomInt) and assert: turn enforcement rejects out-of-turn rolls, captures send tokens to yard, win is detected, and /api/payout/sign returns a valid signature only for the verified winner. This is the test coverage that actually protects funds and game integrity.

</details>

---

## 🟡 Medium Findings

| ID | Subsystem | Titel | Datei | Empfehlung |
|----|-----------|-------|-------|------------|
| AAA-M1 | game-engine | No explicit turn state machine; gamePhase is a stringly-typed value cast with `as any` | `src/engine/gameLogic.ts` | Define a single discriminated-union GamePhase and a typed reducer (e.g. transition(state, event)) with an explicit allowed-transition map. R |
| AAA-M2 | game-engine | createInitialState returns through `as unknown as GameState`, masking a structurally incomplete state | `src/engine/gameLogic.ts` | Type the literal directly as GameState (it has all fields) and delete both casts. Either honor _playerCount or remove it from the signature. |
| AAA-M3 | game-engine | AI danger detection uses global modular wrap, mispredicting threats near home entries | `src/engine/aiEngine.ts` | Compute enemy reachability along that enemy's PLAYER_PATHS array (indexOf currentPos, then +1..+6 within bounds, stopping at home-stretch di |
| AAA-M4 | game-engine | boardMap.ts is dead, contradictory board-mapping code shipped alongside the live mapping | `src/engine/boardMap.ts` | Delete boardMap.ts (and any imports) or, if some helper is genuinely used elsewhere, reduce it to only that and make it source coordinates f |
| AAA-M5 | game-engine | Pervasive `any` in the engine erodes the project's stated strict-TypeScript goal | `src/engine/movementEngine.ts` | Remove logMove entirely (or replace with a real leveled logger). Replace `any[]` with `unknown[]`. Eliminate the phase casts via a proper Ga |
| AAA-M6 | game-engine | AI 'difficulty' does not exist - one fixed heuristic with hardcoded 30% top-2 jitter | `src/engine/aiEngine.ts` | Introduce a Difficulty enum that scales: blunder probability, weight set, and lookahead depth (1-ply greedy for easy, shallow expectimax ove |
| AAA-M7 | game-engine | Test coverage is thin and asserts on structurally impossible / loosely-cast states | `src/engine/__tests__/aiEngine.test.ts` | Add property/integration tests that drive full turns through rollDice -> moveToken -> completeMoveAnimation. Cover: triple-six forfeit, over |
| AAA-M8 | state-and-hooks | dice_rolled uses a fixed 700ms setTimeout to clear isRolling, racing the authoritative state_update | `src/hooks/useGameSocket.ts` | Drive isRolling off authoritative events only (start on dice_rolled, end on the corresponding state_update) or include an explicit animation |
| AAA-M9 | state-and-hooks | localTimerId interval from turn_timer_start leaks across socket reconnects and is closure-scoped, not ref-scoped | `src/hooks/useGameSocket.ts` | Store the interval id in a useRef and clear it in the effect cleanup and on socket disconnect, not just in the next turn_timer_start. |
| AAA-M10 | state-and-hooks | Pervasive 'as any' casts and untyped socket payloads defeat strict TypeScript | `src/hooks/useGameSocket.ts` | Define shared, versioned socket event types (a typed Socket<ServerToClient, ClientToServer>) shared between backend and frontend. Convert Ap |
| AAA-M11 | state-and-hooks | socket and payoutProof live in the global game store and are wiped by reset(), entangling lifecycle with view state | `src/store/useGameStore.ts` | Keep the live Socket instance solely in the hook (ref) and expose only connection status/id through the store. Ensure reset/back-to-lobby ex |
| AAA-M12 | state-and-hooks | Token-diff animation only detects the FIRST changed token and only forward moves; captures and multi-token updates are silently snapped | `src/hooks/useGameSocket.ts` | Have the server emit a structured move event (tokenMoved, captures[], spawns[], bonus) and animate from that explicit description rather tha |
| AAA-M13 | state-and-hooks | useGameAI guards on a ref while reading from the same gameState that the effect also tears down — debounce is fragile | `src/hooks/useGameAI.ts` | Read gameState fresh inside the timer via useGameStore.getState(), and gate strictly on (activePlayer, gamePhase) rather than the whole game |
| AAA-M14 | react-components | Animation timing is duplicated and divergent between App.jsx and Token.jsx, with magic-number setTimeouts as the source of truth | `src/App.jsx` | Centralize all hop/impact durations in one constants module and have the child derive timing from props, or drive the whole move from a sing |
| AAA-M15 | react-components | Heavy game logic runs inside framer-motion AnimatePresence render callbacks and IIFEs in JSX | `src/App.jsx` | Lift the win-screen derivation into a useMemo and the token-click resolution into a memoized handler keyed by token, or precompute the valid |
| AAA-M16 | react-components | WarpTransition randomizes 50 star animations with non-deterministic per-render delay and infinite springs | `src/components/WarpTransition.tsx` | Memoize the per-star delay alongside the star object, reduce star count, and prefer a single CSS keyframe layer or canvas for the starfield  |
| AAA-M17 | react-components | GameHUD/PlayerPods props typed as 'any' for account, weakening the typed surface | `src/components/HUD/GameHUD.tsx` | Define an Account type (address: string; ...) in src/types and use it everywhere account is passed; remove 'any'. |
| AAA-M18 | react-components | Token list uses index-pair keys while framer-motion layoutId drives identity — stacking/merge transitions can mis-animate | `src/App.jsx` | Give each physical token a stable identity (playerIdx + original tokenIdx) and key/layoutId by that, rendering stacked tokens as a represent |
| AAA-M19 | react-components | Zero component test coverage; only two engine tests exist | `src/components` | Add React Testing Library coverage for Dice (keyboard + disabled), Token selection -> handleTokenClick, and the WIN -> claim flow with a moc |
| AAA-M20 | lobby-and-pages | Room-ID validity is decided by a string-length heuristic | `src/pages/GameRoom.tsx` | Validate the room against the backend (GET /api/rooms/:id) before rendering App; render a real 'Room not found' state on 404. Use extractRoo |
| AAA-M21 | lobby-and-pages | All lobby/web3 error handling is window.alert() with no recovery | `src/components/Lobby.jsx` | Replace with a toast/inline error system, classify Web3 errors (user rejection vs revert vs RPC), and remove the duplicate alert in either t |
| AAA-M22 | lobby-and-pages | Landing-page stats are hardcoded mock data with no API wiring | `src/pages/LandingPage.tsx` | Wire stats to a real backend endpoint with a loading skeleton and graceful fallback; fix the currency unit to match Flare. Until live data e |
| AAA-M23 | lobby-and-pages | Polling effect has a stale-closure dependency bug (handleStart not tracked) | `src/components/Lobby.jsx` | Hoist start logic into a useCallback with correct deps and ref it, or drive transitions from socket events (see polling finding) so the hand |
| AAA-M24 | lobby-and-pages | Stake amount handled as untyped string with no validation against balance | `src/components/Lobby.jsx` | Validate betAmount is a positive number <= available balance before enabling the Create/Join button, and surface 'Insufficient balance' inli |
| AAA-M25 | backend-server | /api/rooms leaks full server room state including player addresses with no auth | `backend/server.ts` | Remove or auth-gate this endpoint. If a lobby listing is needed, return a minimal projection (roomId, mode, stake, playerCount, status) and  |
| AAA-M26 | backend-server | Mixed .js/.ts with `any`-typed timer Map and `require()` in ESM defeat strict TypeScript | `backend/server.ts` | Type activeTurnTimers as Map<string, TurnTimer>. Replace require() with a static import and fix the path. Port signer.js/validation.js/contr |
| AAA-M27 | backend-server | declareWinner schedules a 5-minute setTimeout for removal that is untracked and survives logically-finished games | `backend/server.ts` | Register this timeout via registerRoomTimer(room.id, 'finalCleanup', ...) so it is cancellable, and make cleanupRoom idempotent/guard agains |
| AAA-M28 | backend-server | Redis save fire-and-forget on every broadcast with no failure handling or backpressure | `backend/server.ts` | Persist authoritatively (await) at turn boundaries / on critical transitions rather than every broadcast, or debounce. Use checkpoints for p |
| AAA-M29 | backend-server | BackendRoom type duplicated/divergent between server.ts and stateManager.ts (players array vs Record) | `backend/services/stateManager.ts` | Unify on one canonical Room schema (a shared types module) used by both the engine, server, and stateManager. Normalize players to a single  |
| AAA-M30 | web3-and-contracts | test_rng.js validates a non-existent 'bag system' — false confidence in dice fairness | `scripts/test_rng.js` | Either implement the bag/deck RNG it claims to test, or rewrite the test to assert a realistic chi-square tolerance for uniform RNG. Add a d |
| AAA-M31 | web3-and-contracts | Frontend hook uses alert() for all errors and no chain-mismatch guard before sending funds | `src/hooks/useLudoWeb3.ts` | Replace alert() with typed error mapping (user-rejected vs insufficient-funds vs revert reason via decoded custom errors). Add an explicit a |
| AAA-M32 | web3-and-contracts | Hardcoded fallback contract addresses in frontend config — silent wrong-contract risk | `src/config/web3.ts` | Fail loudly (throw) when VITE_LUDOVAULT_ADDRESS is unset in production builds instead of falling back to a literal. Drive the active chain f |
| AAA-M33 | web3-and-contracts | cancelRoom / emergencyWithdraw use a fixed refundPerPlayer == entryAmount, ignoring actual pot — accounting fragility | `smart-contracts/contracts/LudoVault.sol` | Refund based on recorded per-participant deposits or assert the total equals room.pot. Prefer a pull-payment (withdraw) pattern over a push  |
| AAA-M34 | web3-and-contracts | Severely thin test coverage for a fund-holding contract — no negative/security tests | `smart-contracts/test/LudoVault.test.js` | Add negative tests for every revert path (InvalidSignature, NonceAlreadyUsed, DeadlineExpired, NotRoomParticipant, RoomFull, AlreadyJoined), |
| AAA-M35 | audio-vfx-juice | No source pooling / preloading / latency control in audio engine | `src/services/SoundManager.ts` | Precompute the noise buffer once at init and reuse it. Decode real SFX into cached AudioBuffers. Oscillator nodes are single-use by spec so  |
| AAA-M36 | audio-vfx-juice | AmbientLight animates the 'background' gradient and top/left/right/bottom — paints every frame | `src/components/VFX/AmbientLight.jsx` | Drive the spotlight with transform: translate() (compositor) instead of top/left springs; crossfade two pre-rendered gradient layers via opa |
| AAA-M37 | audio-vfx-juice | Board crown animates margin-top + filter on infinite loop (layout/paint thrash) | `src/components/Board.css` | Replace margin-top with transform: translateY(); animate opacity of a pre-blurred glow layer rather than drop-shadow/brightness. Audit the t |
| AAA-M38 | audio-vfx-juice | Player color palette is defined 3+ times with conflicting values — design tokens bypassed | `src/design-system/tokens.css` | Pick one canonical per-player palette in tokens.css (e.g. --player-red), delete the duplicate --color-* set, and consume via CSS variables ( |
| AAA-M39 | audio-vfx-juice | VictoryCelebration effect hook has stale-closure / missing-dependency bug and uses untracked setTimeouts | `src/components/VictoryCelebration.jsx` | Return a cleanup that clearTimeout()s both timers; include playSound in deps (or wrap it in useCallback in useGameVFX); guard sound playback |
| AAA-M40 | audio-vfx-juice | Multiple stacked backdrop-filter: blur layers (overlay 28px + card 16px + chips 8px) — known mobile compositor killer | `src/components/AAACountdown.css` | Limit to one backdrop-filter layer per stacking context; replace inner blurs with a semi-opaque solid or a pre-blurred background image; dro |
| AAA-M41 | build-config-types | No type-check or bundle-budget gate in the build; chunk warning limit raised to 1MB | `package.json` | Add "typecheck": "tsc --noEmit" and run it (plus tests) in CI and pre-deploy. Add a size-limit budget (e.g. size-limit or rollup-plugin-visu |
| AAA-M42 | build-config-types | Env vars are untyped: vite-env.d.ts is stale, forcing (import.meta as any).env casts everywhere | `src/vite-env.d.ts` | Declare all VITE_ vars in ImportMetaEnv (VITE_THIRDWEB_CLIENT_ID, VITE_API_URL, VITE_GOTOKEN_ADDRESS, VITE_LUDOVAULT_ADDRESS, VITE_DEEPSEEK_ |
| AAA-M43 | build-config-types | Type single-source-of-truth already eroding: Player duplicated in AAACountdown.tsx | `src/components/AAACountdown.tsx` | Import and reuse the canonical types from @types (e.g. Pick<Player, 'name'|'color'> or a dedicated view-model derived from it). Add an ESLin |
| AAA-M44 | build-config-types | manualChunks pins game-engine to relative source paths and over-bundles thirdweb with ethers | `vite.config.ts` | Use a manualChunks function keying off node_modules package boundaries for vendors, and split thirdweb and ethers into separate chunks (or l |
| AAA-M45 | build-config-types | flareMainnet chain defined but unused; contracts hardwired to coston2 testnet with no network switch | `src/config/web3.ts` | Introduce a VITE_NETWORK (mainnet|testnet) env that selects the chain and the corresponding validated contract addresses in one place. Make  |
| AAA-M46 | testing-and-continuity | test_rng.js mocks the engine via globals the engine never reads | `scripts/test_rng.js` | Remove the global stubs, import the real constants, and either delete this file or fold it into a proper Vitest statistical test. |
| AAA-M47 | testing-and-continuity | simulation.ts is a manual demo script, not a test, and self-documents broken player-index tracking | `backend/__tests__/simulation.ts` | Move it out of __tests__ into scripts/ as an explicit manual load tool, or convert it into a real Vitest integration test with assertions on |
| AAA-M48 | testing-and-continuity | docs/test engine tests are orphaned duplicates excluded by the Vitest include glob | `vite.config.ts` | Consolidate all engine tests under src/engine/__tests__/, delete the docs/test copies (or relocate and fix their import paths), and ensure t |
| AAA-M49 | testing-and-continuity | Triple-six penalty and win-condition forfeit logic are under-tested despite being core rules | `backend/__tests__/gameLogic.test.js` | Add explicit tests: roll three consecutive 6s and assert activePlayer advanced and consecutiveSixes reset; pin BLOCKADE_STRICT to the actual |
| AAA-M50 | testing-and-continuity | Prior audits overstated test coverage (70/100, all backend tests green) — continuity gap | `docs/AUDIT_REPORT_2026-01-31.md` | Re-baseline: wire `npm test` (frontend) and backend `npm test` into CI, capture real pass/fail + v8 coverage numbers, and replace the qualit |
| AAA-M51 | testing-and-continuity | No coverage thresholds, no CI gate, and console-only assertions in scripts | `vite.config.ts` | Add coverage `thresholds` (e.g. 80% lines on src/engine and backend/services), add a CI job that runs frontend Vitest + backend tests + the  |

---

## ⚪ Low Findings

| ID | Subsystem | Titel | Datei |
|----|-----------|-------|-------|
| AAA-L1 | game-engine | HOME_ENTRY_POSITIONS exported but never used; path correctness relies only on generatePath bounds | `src/engine/constants.ts` |
| AAA-L2 | game-engine | AI utility scoring double-counts danger-escape and lacks home-stretch progress weighting | `src/engine/aiEngine.ts` |
| AAA-L3 | game-engine | Engine relies on Math.random() for AI jitter and local dice, making local games non-deterministic / non-replayable | `src/engine/aiEngine.ts` |
| AAA-L4 | state-and-hooks | useGameStateDerivation getTokensWithCoords runs an O(16) rebuild + Map allocation on every gameState change with no incremental memoization, and uses 'any' for account | `src/hooks/useGameStateDerivation.ts` |
| AAA-L5 | state-and-hooks | Magic numbers and emoji-string state scattered across hooks instead of typed constants | `src/hooks/useGameSocket.ts` |
| AAA-L6 | react-components | Board memoizes cells on a stale dependency (lists 'rotation' but does not use it) | `src/components/Board.jsx` |
| AAA-L7 | react-components | GlobalHeader hard-navigates with window.location.href, defeating the SPA router | `src/components/layout/GlobalHeader.tsx` |
| AAA-L8 | react-components | Logo header is a clickable div with no keyboard/role semantics | `src/components/layout/GlobalHeader.tsx` |
| AAA-L9 | react-components | AAACountdown and PlayerPods use array index as React key | `src/components/AAACountdown.tsx` |
| AAA-L10 | lobby-and-pages | Dead store field mySelectedColor / incomplete player-identity flow | `src/store/useGameStore.ts` |
| AAA-L11 | lobby-and-pages | LandingPage renders 50 randomly-positioned star divs with non-deterministic inline styles | `src/pages/LandingPage.tsx` |
| AAA-L12 | lobby-and-pages | GameBrowser tile click has no keyboard/ARIA semantics | `src/pages/GameBrowser.tsx` |
| AAA-L13 | backend-server | Reconnect window comment says 15s but uses FORFEIT_TIMEOUT_MS (60s); skip timer keyed per-index can be overwritten | `backend/server.ts` |
| AAA-L14 | backend-server | CORS/Socket origin regex allows any subdomain pattern match but credentials:true with permissive !origin | `backend/server.ts` |
| AAA-L15 | web3-and-contracts | GoToken left as an unguarded testnet faucet token with owner-mint and no production gating | `smart-contracts/contracts/GoToken.sol` |
| AAA-L16 | audio-vfx-juice | Math.random() called inside framer-motion animate props — re-randomizes on every render | `src/components/ParticleEffects.jsx` |
| AAA-L17 | audio-vfx-juice | No master volume / SFX-vs-BGM mix; BGM volume hardcoded; mute suspends whole context | `src/services/SoundManager.ts` |
| AAA-L18 | build-config-types | Pervasive 'as any' escape hatches in config undermine the strict type system | `vite.config.ts` |
| AAA-L19 | testing-and-continuity | gameLogic test 'blockade' builds a hand-mocked state missing required fields, masking real behavior | `backend/__tests__/gameLogic.test.js` |

---

## ❌ Widerlegte Findings (Transparenz)

Diese ursprünglich gemeldeten Critical/High-Findings wurden in der adversarialen Verifikation **am echten Code widerlegt** und sind NICHT umzusetzen:

- **[state-and-hooks]** useGameSocket connect() callback re-creates the entire socket connection on every dependency change — _Korrektur:_ The connect useCallback dep array does include the store setters (as claimed), but a fresh socket is NOT spun up on every dependency change. (a) Zustand action setters are stable references and do not change identity, so they rarely trigger recreation. (b) Even when connect() is re-created and re-invoked, both connect() (useGameSocket.ts:47-53) and the App.jsx effect (App.jsx:200-217) guard on the live socket's `_targetRoom`/`_targetAddr` tags and short-circuit when they match the current (roomId, address), so no new io() connection, duplicate join_match, or board reset occurs. The behavior is effectively pinned to (roomId, address). This is at most a low-severity readability nit, not a high-severity bug.
- **[state-and-hooks]** Optimistic local animation and server state_update can animate the same token twice (double-hop / teleport race) — _Korrektur:_ In web3 mode the mover's local animation completes and converges the local token to its destination BEFORE emitMove fires (emit at path.length*hopDuration+100, after the last local hop). When the server state_update echo returns, the diff in useGameSocket.ts:131-146 finds the mover's token already at the destination (oldPos === newPos) and does not re-animate it; it falls through to an instant reconcile (line 203). The activeMovingToken guard (line 138) is a complementary backup for echoes arriving mid-animation, not the sole protection. No double-hop/teleport of the mover's own token occurs; captured-opponent tokens are animated home correctly by design.
- **[backend-server]** Reconnect mid-turn can double-arm or fail to resume the turn timer — _Korrektur:_ On disconnect the turn timer (activeTurnTimers + room.turnExpiresAt) is never cleared — it keeps running. On reconnect the if-branch re-emits the original, unchanged turnExpiresAt, so a player cannot refresh their clock by reconnecting. The activeTurnTimers map entry and room.turnExpiresAt are always set and cleared together atomically, so the desync states the finding relies on are unreachable. The else-branch (handleNextTurn) is an unreachable defensive fallback in normal disconnect/reconnect flow. The only real edge is a <1.5s self-healing window where a just-past expiresAt could be emitted, which is cosmetic, not a stalling exploit. Severity should be downgraded from high to low/informational.
- **[backend-server]** No automated tests for the turn state machine, payout authorization, or recovery — _Korrektur:_ An automated test suite for the staked-game subsystems exists and is wired into the backend build. backend/package.json defines "test" and "test:coverage" jest scripts; backend/__tests__/ contains signer.test.js (payout-authorization / EIP-712 signing), gameLogic.test.js (turn/phase state machine, capture, bonus, blockade), and simulation.ts (end-to-end socket.io game including disconnect/reconnect and winner detection), alongside engine tests in src/engine/__tests__/ and a Hardhat test for the on-chain vault in smart-contracts/test/LudoVault.test.js. The accurate, lower-severity observation is that some tests are shallow (e.g., the signer wallet-not-initialized case is a stubbed/empty test) and forfeit-specific coverage could be deepened — not that tests are absent.

---

## 🗺️ AAA-Roadmap

### P0 Blockers (must-fix before ANY real-money play)

**Ziel:** Make staked funds unstealable and unlockable, and make the authoritative server crash-survivable. Nothing else matters until these are done.

1. LudoVault.sol: enforce on-chain solvency — require(amount <= room.pot) in claimPayout (line 253), derive fee/payout from room.pot only. Add OpenZeppelin Pausable + a guardian role gating createRoom/joinRoom/claimPayout. Extend refund coverage to WAITING rooms (use the declared ROOM_TIMEOUT) so any participant can recover a stuck stake; emergencyWithdraw currently only handles ACTIVE (line 269).
2. Move signer to KMS/HSM (signer.js holds a raw hot key); shorten payout deadline from 24h to minutes; separate testnet/mainnet keys; document a pause->rotate->resume incident runbook. Consider multisig/2-of-3 for mainnet.
3. Externalize authoritative state: move activeRooms (server.ts:106) into Redis as source of truth, add @socket.io/redis-adapter, store turnExpiresAt in Redis with a single sweeper/BullMQ job instead of per-process setTimeout (activeTurnTimers server.ts:215). On recovery of an ACTIVE room, re-arm timers via handleNextTurn so games can't freeze and lock the pot. Write the missing saveCheckpoint() snapshots.
4. Authenticate + rate-limit Socket.IO: verify the address is a room participant before socket.join in join_match (server.ts:576); add a per-socket token-bucket on roll_dice/move_token/join_match; validate socket payloads with the existing zod schemas.
5. Harden payout authorization: in /api/payout/sign (server.ts:904) cross-check contractRoom.status and assert potAmount is within [stake, stake*maxPlayers] and the on-chain participant set matches room.players before signing. Remove the unauthenticated /api/rooms address/position leak (server.ts:915) or gate it behind auth.
6. Make verification fail-closed in production: hard-fail on unconfigured RPC/vault, make txHash required for staked rooms, never return true from contractVerifier when verification could not run.
7. Get a green, asserting CI gate on the money paths: fix backend test imports, standardize on vitest, add EIP-712 signer-recovery + domain-match tests, a Socket.IO full-match integration test (out-of-turn rejection, capture, win, payout-sign-only-for-verified-winner), and a chi-square fairness test on the real randomInt path. Add `tsc --noEmit` to the build so strict errors actually block deploys.

### P1 Foundation (correctness, type safety, architecture)

**Ziel:** Make the codebase honest about its own guarantees: every gameplay/money file under the type checker, the rules engine correct, and the god-files decomposed and tested.

1. Migrate App.jsx (771 lines), Lobby.jsx (726 lines), VictoryCelebration.jsx to .tsx consuming src/types/index.ts; the strict tsconfig provides zero coverage today (include is ['src'], no allowJs). This is the highest-value type-safety work because these files touch staked funds.
2. Extract the move/animation timeline out of App.jsx render into a framework-agnostic, RAF-driven controller/state-machine; App should only render derived state and dispatch intents. Separate the web3 payout flow into its own hook. Target App.jsx under ~150 lines.
3. Fix engine rule fidelity: resolve the bonus double-reward (gameLogic.ts:171-172 set CAPTURE_BONUS/HOME_BONUS as a move distance while consecutiveSixes>0 also grants a re-roll at line 226) — model turn continuation explicitly with exactly one extra roll per qualifying event. Decide and implement/remove blockades (BLOCKADE_STRICT false, constants.ts:106). Fix AI danger detection's modular-wrap mispredict near home entries.
4. Introduce a typed, explicit turn state machine in the engine and a single shared socket contract (typed event payloads) between backend and frontend; today payloads are `any` at the trust boundary and gamePhase is a stringly-typed value cast with `as any`.
5. Decompose server.ts (1140 lines) into transport / TurnController / RoomService(Redis) / route modules / TimerService with injected io and unit tests on the TurnController — it already carries inline FIX/CRITICAL comments documenting prior breakage.
6. Replace HTTP-poll matchmaking (Lobby.jsx 1.5-3s polling) with Socket.IO room/presence events; add durable web3 resume (persist roomId/address/color/index) so a refresh on GameRoom.tsx doesn't drop a staked player into a config-null room; replace window.alert() error handling with classified, retryable UX.
7. Add a seedable/deterministic RNG to the engine (AI jitter + local dice currently call Math.random) so local games are replayable and testable; delete dead code (boardMap.ts, scripts/test_rng.js's phantom bag system, orphaned docs/test duplicates).

### P2 AAA Polish (juice, performance, fairness depth)

**Ziel:** Earn the AAA feel: locked 60fps, real mixed audio, accessibility-correct juice, provably-fair dice, and tunable opponents.

1. Implement the real audio pipeline: fetch+decodeAudioData the mapped .mp3 assets in SoundManager (today play() jumps straight to playSynth at line 46 and never plays soundMap MP3s), pool AudioBufferSourceNodes through a master GainNode, add round-robin sample variation, SFX/BGM buses with volume + ducking. Lazily create/resume AudioContext on first user gesture (currently new'd in the constructor at line 30, starts suspended).
2. Hit locked 60fps: drive the moving token's interpolation outside React state (ref/RAF or framer-motion animate() on one element) and commit a single setGameState at move completion instead of per-hop whole-object updates in App.jsx; move particle systems (50-node confetti, 16-node explosions in ParticleEffects.jsx) to a pooled canvas/WebGL system with a frame budget; drop box-shadow halos and animated background/top/left for transform/opacity only.
3. Respect prefers-reduced-motion across ALL framer-motion effects (useReducedMotion) — confetti, infinite glows and explosions currently ignore it. Add quality tiers (low/med/high) with device-tier downgrade, and mobile haptics (navigator.vibrate) on impacts/captures.
4. Move to provably-fair dice for staked games: Flare RNG oracle or commit-reveal (commit serverSeed hash pre-turn, reveal post-turn, dice = H(serverSeed, clientSeed, nonce)) with an auditable per-roll seed chain — closes the server-trust gap that P0 only mitigates operationally.
5. Unify the design-token system: player colors are hardcoded in 3+ conflicting palettes despite tokens.css existing — make tokens.css the single source of truth. Replace SPA-breaking window.location.href hard reloads (GlobalHeader) with router navigation so a player isn't dropped from a live staked match.
6. Build out AI: replace the single fixed 1-ply greedy heuristic with hardcoded 30% jitter into tunable difficulty tiers with lookahead, and add property/integration tests for triple-six forfeit, exact-home overshoot, capture immunity, and win detection.
7. Add a hard bundle budget that fails CI on regression (chunkSizeWarningLimit is only a 1MB warning today), typed+validated env module (replace (import.meta as any).env), an environment-driven mainnet/testnet contract switch (flareMainnet is defined but unused), and visual-regression + fps benchmarking in CI.

---

## 🧭 Provenance & Wie weiter

- **Quelle:** Multi-Agent-Workflow `goludo-aaa-audit` (Run `wf_1aeca8bc-be7`). Roh-Output (671 KB) und Extract (`C:/tmp/audit-extract.json`) sind die Belege.
- **Verifikation:** Alle 🔴/🟠-Findings wurden von einem zweiten, skeptischen Agent gegen den echten Code geprüft (adversarial). 🟡/⚪ sind unverifiziert gemeldet.
- **Integration später:** Beim Überführen in das formale System die `AAA-*`-IDs als externe Referenz behalten (z. B. „Closes AAA-C3").
- **Strengths (nicht vergessen):** geteilte Rules-Engine Client/Server, server-autoritative `crypto.randomInt`-Würfel, EIP-712-Payouts mit Nonce/Deadline+CEI, sauberer Zustand/Routing-Shell.

