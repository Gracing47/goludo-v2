# 🎲 GoLudo: Developer Handout (Phase 3.5 → UI/UX Enhancement)

> **Current Version:** v4.3 - Robust Reconnect  
> **Status:** Web3 Core Stable | UI/UX Core Implemented | Session Persistence Live

---

## 🚀 Overview for the Next Developer

The project has reached a critical milestone: **Web3 matches are stable.** Players can now join rooms, roll dice, and—most importantly—rejoin ongoing matches after a page refresh or connection drop without losing their session.

Your mission is to elevate the **UI and UX** from "functional" to "Premium/AAA". The foundation is there, but the "soul" of the game lies in the feedback, animations, and smoothness.

### 🛑 CRITICAL PROTOCOL: Antigravity-Kit
This project follows the **Antigravity AI Orchestrator** protocol. 
1. **Agents & Skills:** You MUST use the agents and skills defined in the workspace.
2. **Reading:** Before implementing ANY UI change, read the `frontend-specialist.md` and the appropriate skills (e.g., `frontend-design`, `ui-ux-pro-max`).
3. **Reference:** [Antigravity Kit Repository](https://github.com/vudovn/antigravity-kit/tree/main)

---

## 🛠 Accomplished in Session 4
1.  **Web3 Session Persistence:** Implemented a robust "Watchdog" system in `App.jsx` that automatically re-establishes the socket connection using `gameId` from the URL and the user's wallet address.
2.  **Infinite Socket Loop Fix:** Resolved a critical bug where the app was disconnecting/reconnecting every second.
3.  **Turn Timer (HUD):** Re-implemented the server-synchronized turn timer at the top-center of the HUD, including an "urgent" (red pulsating) state for the last 10 seconds.
4.  **Loading Screen (Debug Mode):** Added a transparency-focused loading screen that shows socket status, room ID, and config state to keep players informed during connection.
5.  **Dice System Equality:** Refactored dice from a global bag to per-player bags in `gameLogic.js`, ensuring fair distribution in 2-player matches.
6.  **Landing Page Redesign:** Overhauled the main entry point with the "Orbitron" gaming font, glassmorphism, and animated star backgrounds.

---

## 🎯 Next Steps: UI/UX Enhancement

### 1. Game Board Feedback (The "Juice")
*   **Token Movement:** The current token jump is functional but lacks "weight". Add smooth CSS transitions or 3D animations when tokens move.
*   **Capture Effects:** The `CaptureExplosion` is there, but could be more dramatic (screenshake, glow).
*   **Active Player Glow:** Enhance the current `player-pod.active` glow. It should feel alive (pulse).

### 2. Commentator & Ticker
*   The `Commentator.tsx` (LudoBot) needs to be more reactive to Game state (Zustand). It should joke about rolls, captures, and wins.
*   The `game-ticker` text at the bottom is currently very simple. Make it feel like a sports broadcast.

### 3. Mobile Optimization
*   The "Player Pods" are anchored to corners to avoid board overlap, but on very small screens (iPhone Mini), the layout gets tight. 
*   Ensure the 3D dice area (`MiniDice`) is large enough for thumbs.

### 4. Web3 Feedback
*   Enhance the transition between "Transaction Confirmed" and "Joining Room". It currently feels like a technical wait; make it feel like a "Warp Space" transition.

---

## 📂 Key Code Map
*   `src/App.jsx`: Main logic, Socket handlers, Watchdog (Line 350+).
*   `src/store/useGameStore.ts`: Global state (Zustand). All UI should react to these values.
*   `src/engine/gameLogic.js`: Core rules and fair dice system.
*   `src/components/Board.tsx`: Board rendering and coordinate mapping.
*   `src/index.css` & `src/App.css`: Global design tokens and animations.

---

## 🛡️ Developer Note on Safety
Every change MUST pass the **Socratic Gate**. If you are adding a new UI component, ask yourself:
*   "Does this scale on mobile?"
*   "Is the z-index correct (HUD above Board)?"
*   "Does this interfere with the socket-state synchronization?"

**Good luck, Pilot. Make it shine.**  ✨
