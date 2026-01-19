# URL Routing Architecture Plan

> **Status:** PLANNING (No code yet)
> **Created:** 2026-01-19
> **Type:** WEB (React + Vite)

---

## 🎯 Goal

Implement a scalable, SEO-friendly URL routing system that:
1. Separates Landing Page from the App
2. Supports multiple game modes (Web3, Local AI, Hot-Seat)
3. Uses clean URLs for Google indexing
4. Follows DRY principles with shared components
5. Does NOT break existing functionality

---

## 📊 User Flow

```
┌─────────────────┐
│  Landing Page   │  /
│  (Stats, Hero)  │
└────────┬────────┘
         │ "Launch App"
         ▼
┌─────────────────┐
│   Game Browser  │  /app
│  (Web3 Focus)   │
└────────┬────────┘
         │ Select Game
         ▼
┌─────────────────┐
│   Game Lobby    │  /app/ludo  (or /app/chess, etc.)
│ (Create/Join)   │
└────────┬────────┘
         │ Create/Join Room
         ▼
┌─────────────────┐
│  Waiting Room   │  /game/:roomId
│  (Players Join) │
└────────┬────────┘
         │ Game Starts
         ▼
┌─────────────────┐
│   Game Board    │  /game/:roomId (same URL, different state)
│    (Playing)    │
└────────┬────────┘
         │ Game Ends
         ▼
┌─────────────────┐
│  Victory/Claim  │  /game/:roomId (overlay on game)
│   (Web3 Payout) │
└─────────────────┘
```

---

## 🗂️ URL Structure

| Route | Component | Purpose | SEO |
|-------|-----------|---------|-----|
| `/` | `LandingPage` | Marketing, Stats, Hero | ✅ Indexed |
| `/app` | `GameBrowser` | Browse available games | ✅ Indexed |
| `/app/ludo` | `LudoLobby` | Ludo-specific lobby | ✅ Indexed |
| `/app/ludo/local` | `LocalGameSetup` | Local game mode selection | ❌ No-index |
| `/game/:roomId` | `GameRoom` | Active game (universal) | ❌ No-index |

### URL Principles (SEO Best Practice):
- **Lowercase only**: `/app/ludo` not `/App/Ludo`
- **Hyphens for spaces**: `/app/ludo-classic` not `/app/ludo_classic`
- **No trailing slashes**: `/app` not `/app/`
- **Descriptive paths**: `/app/ludo` not `/app/g1`
- **Short & meaningful**: Max 3 levels deep

---

## 🏗️ File Structure (Proposed)

```
src/
├── main.tsx                 # Entry point (unchanged)
├── App.tsx                  # Router wrapper (NEW - replaces App.jsx routing)
├── App.jsx                  # Game logic (REFACTOR - remove routing)
│
├── pages/                   # NEW: Page components
│   ├── LandingPage.tsx      # Marketing page with stats
│   ├── GameBrowser.tsx      # Browse games grid
│   ├── LudoLobby.tsx        # Ludo lobby (create/join)
│   └── GameRoom.tsx         # Universal game wrapper
│
├── components/
│   ├── landing/             # NEW: Landing page components
│   │   ├── Hero.tsx
│   │   ├── StatsBar.tsx
│   │   └── GameCards.tsx
│   ├── game/                # Existing game components
│   │   ├── Board.jsx
│   │   ├── Token.jsx
│   │   └── Dice.jsx
│   └── shared/              # NEW: Shared UI components
│       ├── Navbar.tsx
│       └── Footer.tsx
│
├── config/
│   ├── routes.ts            # NEW: Route definitions (centralized)
│   └── api.js               # Existing
│
└── store/
    └── useGameStore.ts      # Existing (add route state if needed)
```

---

## ✅ Success Criteria

| Criteria | Verification |
|----------|--------------|
| Landing page loads at `/` | `curl localhost:5173/` returns HTML with stats |
| App loads at `/app` | Navigate shows game browser |
| Game room works at `/game/:id` | Direct URL access shows game |
| No 404 on refresh | Vite SPA fallback configured |
| SEO meta tags present | View source shows `<title>`, `<meta>` |
| Existing game logic unchanged | All 39 tests still pass |

---

## 📋 Task Breakdown

### Phase 1: Foundation (No Breaking Changes)

- [ ] **Task 1.1**: Create `src/config/routes.ts`
  - INPUT: Route constants needed
  - OUTPUT: Centralized route definitions
  - VERIFY: File exists, exports ROUTES object

- [ ] **Task 1.2**: Create `src/pages/` directory structure
  - INPUT: File structure above
  - OUTPUT: Empty page files with basic exports
  - VERIFY: `ls src/pages/` shows 4 files

- [ ] **Task 1.3**: Create `src/components/shared/` directory
  - INPUT: Navbar, Footer needed
  - OUTPUT: Basic shared component files
  - VERIFY: Files exist

### Phase 2: Router Setup

- [ ] **Task 2.1**: Create `AppRouter.tsx` with React Router v6
  - INPUT: Routes from `routes.ts`
  - OUTPUT: Router with all routes defined
  - VERIFY: No TypeScript errors

- [ ] **Task 2.2**: Update `main.tsx` to use new router
  - INPUT: Current BrowserRouter setup
  - OUTPUT: Import AppRouter, remove inline BrowserRouter
  - VERIFY: App still starts

- [ ] **Task 2.3**: Configure Vite for SPA fallback
  - INPUT: `vite.config.ts`
  - OUTPUT: Add historyApiFallback or equivalent
  - VERIFY: Direct URL access works after build

### Phase 3: Landing Page

- [ ] **Task 3.1**: Create `LandingPage.tsx` with Hero section
  - INPUT: Design requirements
  - OUTPUT: Premium landing page component
  - VERIFY: Renders at `/`

- [ ] **Task 3.2**: Create `StatsBar.tsx` component
  - INPUT: API endpoint for stats
  - OUTPUT: Stats display (games played, earnings, etc.)
  - VERIFY: Shows mock data initially

- [ ] **Task 3.3**: Add "Launch App" button navigation
  - INPUT: Route to `/app`
  - OUTPUT: Button navigates correctly
  - VERIFY: Click → shows game browser

### Phase 4: Game Browser

- [ ] **Task 4.1**: Create `GameBrowser.tsx`
  - INPUT: List of available games
  - OUTPUT: Grid of game cards with links
  - VERIFY: Shows Ludo card, clickable

- [ ] **Task 4.2**: Create game card component
  - INPUT: Game metadata (name, image, stake range)
  - OUTPUT: Reusable card component
  - VERIFY: Displays correctly

### Phase 5: Refactor App.jsx

- [ ] **Task 5.1**: Extract Lobby logic to `LudoLobby.tsx`
  - INPUT: Lobby code from App.jsx
  - OUTPUT: Standalone lobby page
  - VERIFY: Create/Join flow works

- [ ] **Task 5.2**: Create `GameRoom.tsx` wrapper
  - INPUT: Game board code from App.jsx
  - OUTPUT: Page that loads game by roomId
  - VERIFY: `/game/:roomId` shows correct game

- [ ] **Task 5.3**: Slim down `App.jsx` to game logic only
  - INPUT: Current 900+ line file
  - OUTPUT: ~300 line game component
  - VERIFY: All game functionality preserved

### Phase 6: Verification

- [ ] **Task 6.1**: Run full test suite
  - COMMAND: `npm test`
  - VERIFY: 39/39 tests pass

- [ ] **Task 6.2**: Build production bundle
  - COMMAND: `npm run build`
  - VERIFY: No errors, bundle created

- [ ] **Task 6.3**: Test all routes manually
  - INPUT: List of routes
### Phase 1: Foundation (No Visual Changes) ✅ COMPLETE

| Task | File | Action | Status |
|------|------|--------|--------|
| 1.1 | `src/config/routes.ts` | Create route constants | ✅ Done |
| 1.2 | `src/pages/` | Create directory | ✅ Done |
| 1.3 | `vite.config.ts` | Add SPA fallback | ⏭️ Deferred |

### Phase 2: Router Setup ✅ COMPLETE

| Task | File | Action | Status |
|------|------|--------|--------|
| 2.1 | `src/AppRouter.tsx` | Create with `Routes`, `Route` | ✅ Done |
| 2.2 | `src/main.tsx` | Import/use `AppRouter` | ✅ Done |
| 2.3 | All routes | Configure lazy loading | ✅ Done |

### Phase 3: Landing Page ✅ COMPLETE

| Task | File | Action | Status |
|------|------|--------|--------|
| 3.1 | `src/pages/LandingPage.tsx` | Premium hero section | ✅ Done |
| 3.2 | `src/pages/LandingPage.css` | Styling | ✅ Done |
| 3.3 | Stats API | Mock endpoint | ✅ Mock data |

### Phase 4: Game Browser ✅ COMPLETE

| Task | File | Action | Status |
|------|------|--------|--------|
| 4.1 | `src/pages/GameBrowser.tsx` | Game grid | ✅ Done |
| 4.2 | `src/pages/GameBrowser.css` | Styling | ✅ Done |

### Phase 5: Lobby Extraction ✅ COMPLETE

| Task | File | Action | Status |
|------|------|--------|--------|
| 5.1 | `src/pages/LudoLobby.tsx` | Wrapper for existing Lobby | ✅ Done |
| 5.2 | Route `/app/ludo` | Point to LudoLobby | ✅ Done |

### Phase 6: GameRoom Wrapper ✅ COMPLETE

| Task | File | Action | Status |
|------|------|--------|--------|
| 6.1 | `src/pages/GameRoom.tsx` | Wrap App.jsx | ✅ Done |
| 6.2 | Route `/game/:roomId` | Point to GameRoom | ✅ Done |

### Phase 7: Final Verification.

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing game flow | Keep App.jsx game logic intact, only extract routing |
| Socket connection issues | Maintain socket in Zustand store, pass to GameRoom |
| URL params not syncing | Use React Router's useParams consistently |
| Build size increase | Use React.lazy() for page splitting |

---

## 🔧 Tech Stack Additions

| Package | Version | Purpose |
|---------|---------|---------|
| `react-router-dom` | ^6.x | Already installed |
| `react-helmet-async` | ^2.x | SEO meta tags |

---

## 📝 Notes

1. **Backward Compatibility**: Old direct links to game rooms should still work
2. **Mobile First**: All new pages must be responsive
3. **Loading States**: Each page needs skeleton/loader
4. **Error Boundaries**: Wrap each route in error boundary

---

## 🚫 Out of Scope (Future)

- [ ] Multi-game support (Chess, etc.)
- [ ] User profiles (`/profile/:userId`)
- [ ] Tournament brackets (`/tournament/:id`)
- [ ] Leaderboards (`/leaderboard`)

---

> **Next Step:** Review this plan, then proceed to Phase 1 implementation.
