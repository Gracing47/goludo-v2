# URL Routing Architecture - Deep Analysis Report

> **Document ID:** URL-ARCH-001  
> **Status:** ANALYSIS COMPLETE - AWAITING APPROVAL  
> **Created:** 2026-01-19  
> **Author:** Antigravity Agent (project-planner)

---

## 📋 Executive Summary

This document provides a **line-by-line analysis** of `App.jsx` (913 lines) and `App.css` (680 lines) to ensure a **zero-breakage** URL routing implementation. Every dependency, state variable, and render path is mapped.

---

## 🔬 Part 1: App.jsx Deep Analysis

### 1.1 Import Dependencies (Lines 1-48)

| Line | Import | Purpose | Migration Impact |
|------|--------|---------|------------------|
| 12 | `React, useState, useCallback, ...` | Core React hooks | ✅ Keep unchanged |
| 13 | `socket.io-client` | WebSocket for multiplayer | ⚠️ Must persist across routes |
| 14 | `ethers` | Ethereum utilities | ✅ Keep unchanged |
| 15-21 | Local components | `Lobby, Board, Token, Dice, etc.` | ✅ Move to routes |
| 22 | `soundManager` | Audio service singleton | ✅ Global, no change |
| 23 | `useLudoWeb3` | Web3 hook | ✅ Keep at root level |
| 24 | `react-router-dom` | Router hooks (`useNavigate`, `useParams`) | ⚠️ Already integrated |
| 25 | `API_URL, SOCKET_URL` | Config constants | ✅ Keep unchanged |
| 29-30 | `useGameStore, useShallow` | Zustand state | ✅ Keep at root level |
| 32-38 | Engine constants | `PLAYER_COLORS, MASTER_LOOP, etc.` | ✅ Keep unchanged |
| 40-45 | Game logic functions | `createInitialState, rollDice, etc.` | ✅ Keep unchanged |
| 47 | `calculateAIMove` | AI engine | ✅ Keep unchanged |

### 1.2 Zustand Store Mapping (Lines 49-89)

**Current State Shape:**
```typescript
{
  appState: 'lobby' | 'game',     // ⚠️ KEY: Controls current view
  config: GameConfig | null,      // Game configuration
  state: GameState | null,        // Engine state
  isRolling: boolean,             // Animation flag
  isMoving: boolean,              // Animation flag
  boardRotation: number,          // 0, 90, 180, 270
  serverMsg: string | null,       // Toast message
  turnTimer: number | null,       // Countdown seconds
  payoutProof: object | null,     // Web3 payout data
  socket: Socket | null,          // Socket.io instance
}
```

**Critical Finding:** `appState` is the **single source of truth** for which view is rendered (line 707). This MUST be preserved during routing.

### 1.3 Local State Variables (Lines 95-130)

| Variable | Purpose | Scope |
|----------|---------|-------|
| `aiActionInProgress` (ref) | Prevent double AI moves | Game only |
| `socketRef` (ref) | Direct socket access | Game only |
| `isRollingRef` (ref) | Safety timeout check | Game only |
| `isClaiming` (useState) | Web3 claim button state | Game only |
| `captureEffects` (useState) | Explosion particles | Game only |
| `spawnEffects` (useState) | Spawn sparkles | Game only |
| `isMuted` (useState) | Sound toggle | Global (move to context?) |
| `menuOpen` (useState) | Dropdown state | Game only |

### 1.4 Core Callbacks (Lines 132-468)

| Callback | Lines | Dependencies | Migration Notes |
|----------|-------|--------------|-----------------|
| `handleToggleMute` | 132-135 | `soundManager` | ✅ Keep |
| `handleInteraction` | 137-142 | `soundManager` | ✅ Keep |
| `onGameStart` | 153-268 | `account`, `setGameConfig`, `setGameState`, `setAppState`, `setSockets`, etc. | ⚠️ CRITICAL - This is Web3/Local game initialization |
| `handleStartGame` | 271-284 | `onGameStart`, `navigate` | ⚠️ Called from Lobby, navigates to `/game/:id` |
| `handleBackToLobby` | 321-329 | `resetStore`, `navigate` | ⚠️ Resets state AND navigates to `/` |
| `handleRoll` | 332-370 | `gameState`, `isRolling`, `isMoving`, `gameConfig`, `account` | ✅ Game-only |
| `executeMove` | 373-468 | `gameState`, `gameConfig`, `account` | ✅ Game-only |
| `handleTokenClick` | 471-484 | `gameState`, `gameConfig`, `executeMove` | ✅ Game-only |
| `handleReset` | 487-492 | `gameConfig` | ✅ Game-only |

### 1.5 Effects (Lines 494-576)

| Effect | Lines | Purpose | Trigger |
|--------|-------|---------|---------|
| AI Turn Handler | 494-539 | Automates AI moves | `gameState`, `gameConfig`, `appState`, `isRolling`, `isMoving` |
| Win/Payout Handler | 541-576 | Requests payout signature | `gameState.gamePhase === 'WIN'` |

### 1.6 Render Logic (Lines 706-912)

**Three Render Paths:**

1. **LOBBY** (Lines 707-713)
   - Triggered by: `appState === 'lobby'`
   - Renders: `<Lobby onStartGame={handleStartGame} />`
   - CSS Class: `.app`

2. **LOADING** (Lines 716-729)
   - Triggered by: `!gameState || !gameConfig`
   - Renders: Loading spinner + "Return to Lobby" button
   - CSS Class: `.app-loading`

3. **GAME** (Lines 748-908)
   - Triggered by: `appState === 'game' && gameState && gameConfig`
   - Renders: Board, Tokens, HUD, Avatars, Dice, Victory, etc.
   - CSS Class: `.app.aaa-layout`

---

## 🎨 Part 2: App.css Deep Analysis

### 2.1 CSS Variables (Lines 6-21)

```css
:root {
  --bg-dark, --panel-glass, --neon-blue, --neon-gold, --neon-pink
  --z-board, --z-hud, --z-modal
  --color-red, --color-green, --color-yellow, --color-blue
}
```
**Impact:** These are global and MUST remain in root stylesheet.

### 2.2 Layout Classes

| Class | Lines | Purpose | Used In |
|-------|-------|---------|---------|
| `.app` | 36-43 | Root container (scrollable) | Lobby |
| `.app.aaa-layout` | 45-53 | Game layout (fixed, no scroll) | Game |
| `.board-layer` | 59-70 | Board positioning | Game |
| `.game-hud` | 84-92 | Overlay layer | Game |

### 2.3 Component-Specific Styles

| Selector | Lines | Dependency |
|----------|-------|------------|
| `.player-corner.*` | 107-261 | Avatar positioning |
| `.bottom-dock.*` | 267-450 | Controls bar |
| `.modal-overlay.*` | 456-539 | Win screen |
| `.server-toast` | 542-567 | Message popup |
| `.web3-claim-overlay.*` | 594-680 | Payout button |

---

## ⚠️ Part 3: Critical Dependencies Map

### 3.1 File Dependencies

```
App.jsx
├── components/Lobby.jsx          → Render Path 1
├── components/Board.jsx          → Render Path 3
├── components/Token.jsx          → Render Path 3
├── components/Dice.jsx           → Render Path 3
├── components/CaptureExplosion.jsx → Render Path 3
├── components/VictoryCelebration.jsx → Render Path 3
├── components/ParticleEffects.jsx → Render Path 3
├── services/SoundManager.js      → Global
├── hooks/useLudoWeb3.js          → Global
├── store/useGameStore.ts         → Global
├── engine/constants.js           → Data
├── engine/gameLogic.js           → Functions
├── engine/aiEngine.js            → Functions
└── config/api.js                 → Constants
```

### 3.2 Navigation Flow (Current)

```
/ (or any route)
    └── App.jsx
        ├── appState === 'lobby'  → <Lobby />
        └── appState === 'game'   → <Board /> + HUD
```

### 3.3 Navigation Flow (Proposed)

```
/ (Landing)
    └── LandingPage.tsx (NEW)
        └── "Launch App" → navigate('/app')

/app (Game Browser)
    └── GameBrowser.tsx (NEW)
        └── "Play Ludo" → navigate('/app/ludo')

/app/ludo (Lobby)
    └── LudoLobby.tsx (EXTRACTED from App.jsx lines 707-713)
        └── "Create/Join" → navigate('/game/:roomId')

/game/:roomId (Game)
    └── GameRoom.tsx (WRAPPER)
        └── App.jsx (REFACTORED - game-only logic)
```

---

## 📐 Part 4: Refactoring Strategy

### 4.1 What STAYS in App.jsx

| Section | Lines | Reason |
|---------|-------|--------|
| Zustand hooks | 49-89 | Global state |
| Socket listeners | 172-252 | Must persist during game |
| Game callbacks | 332-492 | Core game logic |
| AI effect | 494-539 | Game-specific |
| Win/Payout effect | 541-576 | Game-specific |
| Game render | 748-908 | Game UI |

### 4.2 What MOVES OUT of App.jsx

| Section | Lines | Destination |
|---------|-------|-------------|
| Lobby render logic | 707-713 | `pages/LudoLobby.tsx` |
| `appState` conditional | 707, 716 | Router decides |
| Loading fallback | 716-729 | `GameRoom.tsx` wrapper |

### 4.3 What GETS CREATED

| File | Purpose |
|------|---------|
| `src/pages/LandingPage.tsx` | Marketing page with stats |
| `src/pages/GameBrowser.tsx` | Game selection grid |
| `src/pages/LudoLobby.tsx` | Create/Join room for Ludo |
| `src/pages/GameRoom.tsx` | Wrapper that loads App.jsx |
| `src/config/routes.ts` | Route constants |
| `src/AppRouter.tsx` | React Router v6 setup |

---

## 🛡️ Part 5: Safety Guarantees

### 5.1 No Breaking Changes Checklist

- [ ] All existing imports remain valid
- [ ] `useGameStore` stays at root level
- [ ] Socket connection logic unchanged
- [ ] All 39 tests still pass
- [ ] URL `/game/:roomId` continues to work
- [ ] Local storage persistence unchanged
- [ ] Web3 payout flow unchanged

### 5.2 Bugs Found During Analysis

| Location | Issue | Severity | Fix |
|----------|-------|----------|-----|
| App.jsx:390-396 | `PLAYER_START_POSITIONS` used but **NOT IMPORTED** | 🔴 CRITICAL | Add to import from `engine/constants.js` |
| App.jsx:206, 262 | `colorMap` defined twice | ⚠️ Low | Extract to `engine/constants.js` |

---

## 📋 Part 6: Phased Implementation Plan

### Phase 1: Foundation (No Visual Changes)

| Task | File | Action | Verify |
|------|------|--------|--------|
| 1.1 | `src/config/routes.ts` | Create route constants | File exists |
| 1.2 | `src/pages/` | Create directory | Directory exists |
| 1.3 | `vite.config.ts` | Add SPA fallback | Direct URL access works |

### Phase 2: Router Setup

| Task | File | Action | Verify |
|------|------|--------|--------|
| 2.1 | `src/AppRouter.tsx` | Create with `Routes`, `Route` | No TS errors |
| 2.2 | `src/main.tsx` | Import/use `AppRouter` | App starts |
| 2.3 | All routes | Configure lazy loading | Chunks created |

### Phase 3: Landing Page

| Task | File | Action | Verify |
|------|------|--------|--------|
| 3.1 | `src/pages/LandingPage.tsx` | Premium hero section | Renders at `/` |
| 3.2 | `src/pages/LandingPage.css` | Styling | Matches design |
| 3.3 | Stats API | Mock endpoint | Shows data |

### Phase 4: Game Browser

| Task | File | Action | Verify |
|------|------|--------|--------|
| 4.1 | `src/pages/GameBrowser.tsx` | Game grid | Shows Ludo card |
| 4.2 | Click handler | Navigate to `/app/ludo` | Works |

### Phase 5: Lobby Extraction

| Task | File | Action | Verify |
|------|------|--------|--------|
| 5.1 | `src/pages/LudoLobby.tsx` | Extract from App.jsx | Create/Join works |
| 5.2 | `src/App.jsx` | Remove lobby conditional | No dual render |
| 5.3 | Route `/app/ludo` | Point to LudoLobby | Loads correctly |

### Phase 6: GameRoom Wrapper

| Task | File | Action | Verify |
|------|------|--------|--------|
| 6.1 | `src/pages/GameRoom.tsx` | Wrap App.jsx | Game loads |
| 6.2 | Route `/game/:roomId` | Point to GameRoom | Direct URL works |
| 6.3 | Socket persistence | Ensure no reconnect | No flicker |

### Phase 7: Final Verification

| Task | Command | Expected |
|------|---------|----------|
| 7.1 | `npm test` | 39/39 pass |
| 7.2 | `npm run build` | No errors |
| 7.3 | Manual test all routes | All work |
| 7.4 | Lighthouse SEO | Score > 90 |

---

## 📊 Part 7: Files Affected Summary

| File | Action | Risk |
|------|--------|------|
| `src/main.tsx` | Minor edit | Low |
| `src/App.jsx` | Remove lobby render | Medium |
| `src/App.css` | Keep as-is | None |
| `src/config/routes.ts` | **NEW** | None |
| `src/pages/LandingPage.tsx` | **NEW** | None |
| `src/pages/LandingPage.css` | **NEW** | None |
| `src/pages/GameBrowser.tsx` | **NEW** | None |
| `src/pages/LudoLobby.tsx` | **NEW** | None |
| `src/pages/GameRoom.tsx` | **NEW** | None |
| `src/AppRouter.tsx` | **NEW** | None |
| `vite.config.ts` | Minor edit | Low |

---

## ✅ Approval Checklist

Before implementation, confirm:

- [ ] User Flow is correct (Landing → Browser → Lobby → Game)
- [ ] URL structure approved (`/`, `/app`, `/app/ludo`, `/game/:roomId`)
- [ ] Phase order is acceptable
- [ ] Risk assessment is understood
- [ ] Ready to proceed with Phase 1

---

> **Next Step:** Await user approval, then begin Phase 1 implementation with full documentation at each step.
