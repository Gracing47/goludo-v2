# 🧠 Developer Briefing: Logic Polish & UX Enhancements

## Objective
Refine the game rules to strictly adhere to classic Ludo mechanics and improve the visual "handiness" of the UI. Focus on the "Blockade" rule and visual feedback for the board.

---

## 🛠️ Part 1: Game Logic Fixes

### 1. 🧱 Enforce Blockade Rule
**Problem:** Currently, players can jump over "Blockades" (2 tokens of the same color on a single cell).
**Rule:** A blockade cannot be passed by ANY player (including the owner). It acts as a wall.
**Fix:**
- Open `src/engine/constants.js`.
- Set `BLOCKADE_STRICT: true`.
- *Note:* The `movementEngine.js` already has the logic (`isBlockedByBlockade`) implemented, it was just disabled by this flag.

### 2. 🎁 Bonus Move Edge Case
**Problem:** When a player lands a token in the goal, they get +10 bonus moves. If they have *no other tokens on the board* (all in Yard or Finished), the game might confuse the user why nothing happens.
**Fix:**
- In `src/engine/gameLogic.js` → `completeMoveAnimation`:
    - Detected that `validBonusMoves.length === 0`.
    - **Add a Message:** If a bonus is awarded but valid moves are 0, set `state.message = "Bonus forfeited! No active tokens."`.
    - Ensure the turn passes automatically after this message (or a short delay).

---

## 🎨 Part 2: UX & Visuals

### 1. 🔍 Token Size & Handiness
**Problem:** Tokens are "too small" and hard to click.
**Request:**
- In `src/components/Token.css`:
    - Increase `.token` size (e.g., from `32px` to `40px` or use dynamic `80%` of cell size).
    - Ensure the click target area (hitbox) is full cell size if possible.
    - Check stacking logic (`getStackOffset` in `Token.jsx`) so larger tokens don't obscure each other too much.

### 2. ✨ Glow Effects
**Request:** Make the board feel more alive.
- **Active Base Glow:**
    - When it's Red's turn, the **Red Base Area** (the 4-token yard) should emit a soft pulsing glow (`box-shadow` or `filter: drop-shadow`).
    - *Implementation:* In `Board.css` or `App.css`, add a class like `.base-red.active-turn` and toggle it in `Board.jsx` based on `activePlayer`.
- **Home Stretch Highlight:**
    - The "Home Path" (the 5 cells leading to center) should light up slightly when a player is on it or can enter it.
    - *Implementation:* Add a subtle `background-color` transition to the cells in `Board.jsx` corresponding to `HOME_STRETCH_COORDS`.

---

### 🚀 Handover
- **Files:** `src/engine/constants.js`, `src/engine/gameLogic.js`, `src/components/Token.css`, `src/components/Board.jsx`.
- **Goal:** Strict rules + "Juicy" visuals.
