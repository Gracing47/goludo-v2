# Developer Handover: GoLudo V2

> [!IMPORTANT]
> **To the Next Developer:** Before starting, ensure you are utilizing **OpenClaw** correctly for the build and orchestration process. This is critical for maintaining consistency in the dev environment.

## 🧠 Strategic Q&A

### 1. State Atomic Updates
**Current Status:** The client strictly overrides local state with `state_update` from the server.
**Tip:** To avoid jitter during optimistic animations, implement a `sequenceNumber` in the `GameState`. The client should ignore updates where `newSequence <= currentSequence`. For "Smart Animation," let the server state be the source of truth but use a reconciliation layer to finish local animations before snapping to server positions.

### 2. Reconnection Race Conditions
**Current Status:** Reconnecting players receive the full `room` object including the current `gameState`.
**Warning:** The most sensitive moment is during `STARTING` -> `ACTIVE` transition. If a player connects exactly then, ensuring the socket joins the `roomId` room *before* the first `broadcastState` is key (handled in `join_match`).

### 3. Redis Sync Integrity
**Current Status:** Redis saves are asynchronous (`.catch()` in `server.ts`).
**Improvement:** For "AAA" reliability, use a write-through pattern for critical state changes (like Win/Web3 Payouts) where you `await` the Redis/DB sync before responding to the user.

### 4. Turn Timer Precision
**Current Status:** Server sends an absolute `expiresAt` timestamp.
**Grace Period:** Currently, the server calculates `setTimeout` based on the same duration. 
**AAA Tip:** Implement a 1.5s the server-side "Grace Period." The UI timer should reach zero, but the server waits an extra ~1500ms before auto-skipping to account for network jitter.

### 5. Triple-6 & Bonus Internal State
**Current Status:** Fully transparent. `consecutiveSixes` and `bonusMoves` are explicitly tracked in the `GameState` object. No hidden server-side counters.

---

## 💎 AAA Game Dev Tips for GoLudo

### 1. The "Juice" (UX)
- **Token Physics**: Don't just teleport. Use Easing functions for token hops.
- **Capture VFX**: When a token is captured, trigger a screen shake and a "particle explosion" at the target cell.
- **Dynamic Camera**: Slight zoom-in on the active player or the cell where a capture just happened.

### 2. Network & Performance
- **Interpolation**: Use `Framer Motion` for smooth transitions. If a state update comes mid-move, let the current hop finish before pivoting.
- **AI Offloading**: The AI Engine (`aiEngine.ts`) is currently synchronous. For AAA performance, move AI calculations to a WebWorker to keep the UI thread at 60fps.

### 3. Sound Design
- **Layered Audio**: Use different sound samples for landing on a "Safe Zone" vs. a "Standard Cell."
- **Win Celebration**: Trigger a specialized high-fidelity soundscape when a player wins the pot.

## 🛠️ Tech Debt & Roadmap
- **Modular Rules**: The `GAME_MODES` registry in `constants.ts` is ready. To add a mode (e.g., "Turbo"), just add a new object defining `getInitialTokens` and `checkWinner`.
- **Error Silencing**: Redis local errors are silenced. Ensure this is toggled back to "Loud" in production environments.
