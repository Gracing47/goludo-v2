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

## Known issues / next

- 🔴 **P0 fund-safety** (before any real money): `LudoVault.claimPayout` has no `require(amount <= room.pot)` (whole vault drainable, `AAA-C`), no Pausable, single-process in-memory state/timers.
- ⚠️ **Login needs the real `VITE_THIRDWEB_CLIENT_ID`** — placeholder returns `KEY_NOT_FOUND`/401; social login + wallet-connect won't work until set.
- ⚠️ **Bundle weight** ~1.9MB gzipped JS (thirdweb-dominated; main chunk >1MB) — first-load latency on mobile/slow networks.
- ⚠️ **Currency label** shows "ETH" (mock) — should be FLR/C2FLR (`LEO-D` economy).
