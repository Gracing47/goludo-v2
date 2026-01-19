# 💨 Developer Briefing: Juiciness & Micro-Animations

## Objective
Enhance the visual "feel" of GoLudo by adding micro-animations and feedback loops. The goal is to make the game feel alive and responsive ("AAA" quality) without modifying core game rules or logic.

---

## 🛠️ Technical Context
- **State Management:** Zustand (`src/store/useGameStore.ts`).
- **Core Logic:** Engine located in `src/engine/gameLogic.js`.
- **UI Components:** `App.jsx`, `Board.jsx`, `Token.jsx`, `Dice.jsx`.
- **CSS:** Standard CSS variables and animations are preferred.

---

## 📋 Feature Requirements

### 1. 💥 Capture Effects (Explosions)
When a token is captured (sent back to the yard), it should "explode" visually at its last position before disappearing or moving.
- **Trigger:** Monitor `gameState.lastCapture` in `App.jsx`.
- **Implementation:** 
    - Create a simple CSS-based particle system or a brief "burst" animation at the cell coordinates where the capture occurred.
    - Particles should match the color of the *captured* (victim) token.
- **Goal:** Provide satisfying visual feedback for a successful capture.

### 2. 🎡 Token Feedback (Idle Pulse)
Tokens that can currently be moved by the active player should "invite" the player to click them.
- **Trigger:** Tokens where `isHighlighted` is true (valid moves).
- **Implementation:** 
    - In `Token.jsx`, add a subtle vertical floating animation OR a scale-pulse effect to `.token.highlighted`.
    - Use a smooth `cubic-bezier` for the timing to make it feel premium.
- **Goal:** Improve UX by clearly signaling available actions.

### 🎲 Dice Roll Feedback (Shake & Vibe)
Rolling a 6 should feel powerful.
- **Trigger:** When `gameState.diceValue === 6` is set.
- **Implementation:** 
    - **Screen Shake:** Apply a brief, subtle `shake` animation (e.g., 200ms) to the `.board-layer` or `.ludo-board` in `App.jsx`.
    - **Haptic (Mobile):** Use `navigator.vibrate([10, 30, 10])` if available when a 6 is rolled.
- **Goal:** High-energy reinforcement for rolling the best possible number.

---

## ⚠️ Integrity Rules (CRITICAL)
- **Don't Break Logic:** Do NOT touch the move calculation or turn-switching logic. Only add *visual* listeners/layers.
- **Performance:** Keep animations lightweight. Use CSS transforms/opacity where possible to avoid paint storms.
- **State:** Use the existing Zustand store. Do not introduce complex local state unless absolutely necessary for ephemeral animations.

---

## 🗣️ Feedback Requirement
Once finished, please provide a brief report:
1. What animations were added?
2. How did you handle the capture trigger?
3. Did you encounter any performance bottlenecks?

---

### 🚀 Get Started
The relevant files are:
1. `src/components/Token.jsx` & `src/components/Token.css`
2. `src/App.jsx` & `src/App.css`
3. `src/components/Dice.jsx`
