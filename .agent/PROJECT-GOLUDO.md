# PROJECT CONTEXT — goludo-v2

> Goludo-specific layer on top of the Antigravity Kit dev bible. Read at session start alongside `ARCHITECTURE.md`. Keep this living.

## What it is

Web Ludo game with on-chain stakes. **Stack:** React 18 + TypeScript + Vite (frontend), Socket.IO Node backend, Solidity smart contracts on **Flare Network** (LudoVault escrows stakes, GoToken ERC-20). Goal: **AAA quality + 100k concurrent players + durable profit via platform rake.**

## Personas

| Persona | Role | Owns | File |
|---------|------|------|------|
| **Daniel** | Senior Frontend Architect / Engineer | implementation, types, performance, game-engine glue | `agents/frontend-specialist.md` + `agents/game-developer.md` |
| **Leo** | Principal Platform Architect + Game-Economy Designer | scalability (100k), fees/tokenomics, UX-strategy, security-at-scale | (persona; see scale/economy ticket) |
| **Iris** | Lead Product / Visual Designer | bold AAA visual direction, design system | `agents/iris.md` + `skills/frontend-design/goludo-deep-space-neon.md` |

## Inside-tickets (internal tracking — NOT the formal flow)

Kept in `docs/_internal/`, separate from the formal `docs/` audits and the `tasks/{slug}.md` flow. Stable reference IDs.

- `INSIDE-TICKET-AAA-AUDIT.md` — multi-agent code audit. Health **44/100**; 5 critical, 35 high. IDs `AAA-*`.
- `INSIDE-TICKET-AAA-SCALE-ECONOMY.md` — Leo deep-dive: economy, 100k scale, UX, security. IDs `LEO-R*` / decisions `LEO-D*`.
- `INSIDE-TICKET-AAA-UI-ENHANCEMENT.md` — DEEP SPACE NEON UI overhaul. IDs `UI-S*` / `UI-T*` / `UI-P*`.

## Locked economy decisions (owner-approved 2026-06-22)

- **Rake:** tiered **8%** default (`feeBps=800`), treasury = Gnosis-Safe multisig (not deployer EOA), single source-of-truth `feeBps` for contract + server.
- **Free tier:** full F2P growth engine (online ranked, ads/cosmetics, capped per account/day).
- **Coins:** "Make-Money" model — full real-money op, entity **offshore (not DE/EU)**. Firewall: *free-issued value never directly cashable; deposited/won value cashable behind KYC + wager-through.* Needs gaming-law counsel.
- **Launch:** geo-fence + age-gate + KYC-tier the cash rail; free+coins global.

## Current state (2026-06-22)

- ✅ **Type-clean:** `tsc --noEmit` 0 errors (was 65), strict mode honest. Dead code removed (`boardMap.ts`, `engine/rules/`).
- ✅ **Boot-safe:** `web3.ts` degrades gracefully when `VITE_THIRDWEB_CLIENT_ID` missing (was white-screening).
- ✅ **UI:** DEEP SPACE NEON overhaul live across all surfaces; build green, 0 console errors.
- ✅ **thirdweb** updated to **5.120.1**.
- ✅ **Production-readiness push** (PROD-1…6, commit 7fc7d04): fund-safety, audio pipeline, in-game juice, web3 lazy-load, currency, mobile-QA.
- ✅ **Fund-safety (AAA-C1/C2)** at contract level: `claimPayout` pot-bound (`amount == room.pot`), OZ **Pausable** + guardian, WAITING-room refunds, single-source `feeBps`. **19/19 hardhat tests pass.**
- ✅ **Currency** unified to **C2FLR** via `src/config/currency.ts` (no more "ETH").
- ✅ **Bundle:** main app chunk split 1304→284 KB (thirdweb lazy chunks).

## Known issues / next

- 🔴 **P0 scale (AAA-C3)** still open: single-process in-memory room state + turn timers (server.ts) — not horizontally scalable, games freeze on deploy. (Fund-safety is done; this is the other P0.)
- ⚠️ **Post-deploy ops:** `setGuardian()` must be called (defaults to owner); move signer key to KMS; `VAULT_FEE_BPS` env must match on-chain `feeBps`.
- ⚠️ **Login needs the real `VITE_THIRDWEB_CLIENT_ID`** — placeholder returns `KEY_NOT_FOUND`/401.
- ⚠️ **Bundle:** `web3-vendor` (~534 KB) still boots because `GlobalHeader` statically imports `web3.ts` — fully defer thirdweb to finish PROD-3.
- ⚠️ **Audio assets** absent (`public/sounds/*.mp3`) — pipeline plays upgraded synth until real assets generated/added.
- ⚠️ **Perf:** heavy continuous effects (blur/bloom/particles) stall the GPU-less headless renderer; add a device-tier / reduced-effects mode and verify FPS on real low-end mobile.
