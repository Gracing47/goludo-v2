# 🎮 GoLudo Developer Handout - Phase 5 Ready

> **CRITICAL: AGENT PROTOCOL**
> Next Agent MUST use `backend-specialist` for server changes and `frontend-specialist` for UI/UX.
> **MANDATORY SKILLS:** `clean-code`, `api-patterns`, `testing-patterns`.
> **NO EXPLICIT EXPLANATIONS, NO DUPLICATION, NO EXPERIMENTAL CODE.**

---

## 🚀 Recent Accomplishments (Session Summary)

### 1. Web3 Connectivity & Forfeit System
- **Strict Forfeit Logic:** Implemented a global 15s watchdog per player. If a human player stays offline > 15s in an active match, they are permanently removed (`forfeited: true`).
- **Instant Victory:** Matches now resolve instantly if only one player remains (prevents infinite "Waiting for Sockets" loops).
- **Graceful Pausing:** Turn flow pauses while the active player is offline, awaiting either reconnection or watchdog timeout.

### 2. Security & Integrity Hardening
- **Protected Payouts:** `/api/payout/sign` now calculates the prize amount on the server and verifies the winner's address against the actual engine state.
- **Normalization:** All Room IDs are now normalized to lowercase across Sockets and REST API to prevent case-mismatch bugs from Web3 hex strings.
- **Atomic State:** Refactored frontend store access to use atomic selectors (Zustand) for performance and predictability.

### 3. AI & Game Engine
- **Scoring Centralization:** AI scoring constants moved to a central map in `aiEngine.ts`.
- **Logic Fixes:** Fixed `getRelativeProgress` to use correct player paths, ensuring AI makes tactical move choices.

---

## 🛠️ Immediate Next Steps (Priority High)

### 🔴 Session Persistence (Database Integration)
CURRENT ISSUE: All rooms are held in `activeRooms` array (RAM). 
- **Requirement:** Integrate a lightweight DB (Redis or MongoDB) to persist room states. If the server restarts, players must be able to resume ongoing Web3 matches.
- **Skill:** `database-design`

### 🔴 On-Chain Consistency (Web3 Verification)
CURRENT ISSUE: Backend trusts the client's `rooms/create` and `rooms/join` calls.
- **Requirement:** Implement server-side verification using `ethers` or `thirdweb` to check if the transaction really exists on Flare/Coston2 before activating the room in the lobby.
- **Skill:** `api-patterns`

### 🔴 Refund Mechanism
CURRENT ISSUE: If a match is cancelled or never starts, funds are stuck in the contract.
- **Requirement:** Implement a backend-signed "Refund Proof" that allows users to withdraw their stake from `LudoVault` if conditions are met (e.g., room expired).

---

## 🧹 Codebase Standards (DRY)
- **Zero Duplication:** Do NOT create new components if logic exists in `useGameSocket` or `useGameStore`.
- **Type Safety:** Maintain the interface integrity in `src/types/index.ts`.
- **Infrastructure:** All environment variables must be checked in `server.js` and `App.jsx` before use.

**Current Build Version:** `v4.5.1` (Web3 Security + Forfeit Guard)
