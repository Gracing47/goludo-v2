# 🎮 GoLudo - Comprehensive Testing Checklist
## Pre-Deployment Quality Assurance

**Date:** 2026-01-09  
**Version:** 1.0.0  
**Tester:** _____________

---

## ✅ PHASE 1: Backend Health Check

### 1.1 Server Startup
- [ ] Backend starts without errors on port 3333
- [ ] No console errors or warnings
- [ ] Environment variables loaded correctly
- [ ] Socket.IO initialized successfully

**Command:** `npm run dev:backend`  
**Expected:** `🚀 GoLudo Backend running on http://localhost:3333`

### 1.2 API Endpoints
- [ ] `GET /` returns backend info
- [ ] `GET /api/rooms` returns empty array initially
- [ ] `POST /api/rooms/create` creates a room
- [ ] `POST /api/rooms/join` joins a room

**Test:**
```bash
curl http://localhost:3333
curl http://localhost:3333/api/rooms
```

---

## ✅ PHASE 2: Frontend Health Check

### 2.1 Application Startup
- [ ] Frontend starts without errors on port 3000
- [ ] No console errors in browser
- [ ] Lobby screen loads correctly
- [ ] All UI elements visible and styled

**Command:** `npm run dev`  
**Expected:** Clean console, beautiful UI

### 2.2 Visual Polish Check
- [ ] Background gradient displays correctly
- [ ] Glassmorphism effects work
- [ ] Buttons have hover effects
- [ ] Typography is crisp and readable
- [ ] Color scheme is vibrant (not washed out)

---

## ✅ PHASE 3: Local Game (2 Players)

### 3.1 Game Setup
- [ ] Click "Local Game" button
- [ ] Setup screen appears
- [ ] Can select 2, 3, or 4 players
- [ ] Can change player names
- [ ] Can select player colors
- [ ] "Start Local Game" button works

### 3.2 Gameplay - Basic Mechanics
- [ ] Game board renders correctly (15x15 grid)
- [ ] All 4 colored bases visible
- [ ] Tokens start in correct yard positions
- [ ] Dice is clickable and animated
- [ ] Dice shows random values (1-6)
- [ ] Turn indicator shows current player

### 3.3 Gameplay - Token Movement
- [ ] Roll a 6 → Token can leave yard
- [ ] Click highlighted token → Token moves
- [ ] Token follows correct path (MASTER_LOOP)
- [ ] Token animation is smooth
- [ ] Multiple tokens can stack on same cell
- [ ] Tokens display with correct offset when stacked

### 3.4 Gameplay - Special Rules
- [ ] Roll 6 → Get bonus turn
- [ ] Roll 3 sixes in a row → Turn ends
- [ ] Land on opponent → Capture (send to yard)
- [ ] Enter home stretch (last 6 cells)
- [ ] Exact roll to finish
- [ ] All 4 tokens home → WIN

### 3.5 Gameplay - Turn Flow
- [ ] Turn switches to next player after move
- [ ] Turn switches after roll if no valid moves
- [ ] Correct player highlighted in sidebar
- [ ] Status messages update correctly
- [ ] No out-of-turn actions possible

### 3.6 Game Completion
- [ ] Win message displays
- [ ] Winner's name shown
- [ ] "Back to Menu" button works
- [ ] Can start new game

**Test Duration:** ~10 minutes  
**Notes:** _________________________________

---

## ✅ PHASE 4: vs AI Game

### 4.1 AI Setup
- [ ] Click "vs Computer" button
- [ ] Player count defaults to 2
- [ ] Player 1 is Human, Player 2 is AI (🤖)
- [ ] Can change human player name
- [ ] "Start Local Game" button works

### 4.2 AI Behavior
- [ ] AI automatically rolls dice (1.5s delay)
- [ ] AI automatically selects token
- [ ] AI makes valid moves only
- [ ] AI doesn't freeze or crash
- [ ] AI respects bonus turns (roll 6)
- [ ] AI can capture human tokens
- [ ] AI can win the game

### 4.3 Human vs AI Interaction
- [ ] Human can play normally
- [ ] Turns alternate correctly
- [ ] No race conditions
- [ ] Game feels responsive
- [ ] AI doesn't take too long (<3s per action)

**Test Duration:** ~5 minutes  
**Notes:** _________________________________

---

## ✅ PHASE 5: Web3 Match (2 Players)

### 5.1 Wallet Connection
- [ ] "Web3 Match" button visible
- [ ] Click prompts wallet connection
- [ ] Wallet connects successfully
- [ ] Balance displays correctly
- [ ] "Get Test Tokens" link works

### 5.2 Room Creation
- [ ] Click "Create Game"
- [ ] Can select stake (0.1, 1, 10, 25)
- [ ] Can select player count (2, 3, 4)
- [ ] Can set player name
- [ ] Can select color
- [ ] "Create & Pay Stake" button works
- [ ] Transaction confirms
- [ ] Room appears in lobby

### 5.3 Room Joining
- [ ] Open room visible in lobby
- [ ] Shows stake amount
- [ ] Shows player count (1/2)
- [ ] Click "Join" opens modal
- [ ] Can set name
- [ ] Can select available color
- [ ] Taken colors are disabled
- [ ] "Pay & Join" button works
- [ ] Transaction confirms

### 5.4 Game Start
- [ ] Game starts when room full (2/2)
- [ ] Both players see game board
- [ ] Both players connected (no "disconnected" messages)
- [ ] Turn starts with Player 0
- [ ] Timer shows 10 seconds

### 5.5 Web3 Gameplay - Turn Timer
- [ ] Timer counts down (10 → 9 → 8...)
- [ ] Timer turns red at 3 seconds
- [ ] Timer pulses when urgent
- [ ] Roll dice → Timer clears
- [ ] Move token → Timer clears
- [ ] Timeout → Turn skips to next player
- [ ] Skipped turn message appears

### 5.6 Web3 Gameplay - Multiplayer Sync
- [ ] Player 1 rolls → Player 2 sees it
- [ ] Player 1 moves → Player 2 sees it
- [ ] Dice value syncs
- [ ] Token positions sync
- [ ] Turn indicator syncs
- [ ] No duplicate actions
- [ ] No "out of turn" errors

### 5.7 Web3 Gameplay - Player Spotlight
- [ ] Active player card highlighted
- [ ] Active player card scales up
- [ ] Active player has colored glow
- [ ] "You" player has green pulse
- [ ] Inactive players dimmed
- [ ] Status shows "It's your turn!" or "Waiting for..."

### 5.8 Web3 Gameplay - Smart Controls
- [ ] Dice disabled when not your turn
- [ ] Dice disabled in SELECT_TOKEN phase
- [ ] Status text updates correctly
- [ ] Can't click opponent's tokens
- [ ] Can't roll out of turn

### 5.9 Game Completion & Payout
- [ ] Winner message displays
- [ ] "Verifying winner..." message shows
- [ ] Payout signature received
- [ ] "Claim Winnings" button appears
- [ ] Click claim → Transaction
- [ ] Payout received in wallet
- [ ] "Back to Menu" works

**Test Duration:** ~15 minutes (per 2-player match)  
**Notes:** _________________________________

---

## ✅ PHASE 6: Web3 Match (3 Players)

### 6.1 3-Player Setup
- [ ] Can select 3 players in setup
- [ ] 3 colors available (red, green, yellow)
- [ ] Room shows 1/3, then 2/3, then 3/3
- [ ] Game starts when 3/3

### 6.2 3-Player Gameplay
- [ ] Turns rotate: P0 → P1 → P2 → P0
- [ ] All 3 players can roll and move
- [ ] Timer works for all 3 players
- [ ] Disconnected player skipped
- [ ] Game completes with 3 players

**Test Duration:** ~20 minutes  
**Notes:** _________________________________

---

## ✅ PHASE 7: Web3 Match (4 Players)

### 7.1 4-Player Setup
- [ ] Can select 4 players in setup
- [ ] All 4 colors available
- [ ] Room shows 1/4, 2/4, 3/4, 4/4
- [ ] Game starts when 4/4

### 7.2 4-Player Gameplay
- [ ] Turns rotate through all 4 players
- [ ] All players can interact
- [ ] Timer works for all
- [ ] Game completes

**Test Duration:** ~25 minutes  
**Notes:** _________________________________

---

## ✅ PHASE 8: Edge Cases & Stress Tests

### 8.1 Connection Issues
- [ ] Player refreshes mid-game → Reconnects
- [ ] Player closes tab → Marked as disconnected
- [ ] Disconnected player's turns skipped
- [ ] Game continues with remaining players
- [ ] Player reconnects → Can resume

### 8.2 Rapid Actions
- [ ] Spam click dice → Only one roll
- [ ] Spam click token → Only one move
- [ ] No duplicate state updates
- [ ] No race conditions

### 8.3 Invalid Actions
- [ ] Can't roll when not your turn
- [ ] Can't move when not SELECT_TOKEN phase
- [ ] Can't select invalid token
- [ ] Can't join full room
- [ ] Can't select taken color

### 8.4 Browser Compatibility
- [ ] Chrome: Works perfectly
- [ ] Firefox: Works perfectly
- [ ] Safari: Works perfectly
- [ ] Edge: Works perfectly
- [ ] Mobile Chrome: Responsive
- [ ] Mobile Safari: Responsive

**Test Duration:** ~15 minutes  
**Notes:** _________________________________

---

## ✅ PHASE 9: Performance & Polish

### 9.1 Performance
- [ ] No lag during gameplay
- [ ] Animations smooth (60fps)
- [ ] No memory leaks
- [ ] Backend handles 10+ concurrent games
- [ ] Frontend handles 4-player game smoothly

### 9.2 Visual Polish
- [ ] All animations smooth
- [ ] No visual glitches
- [ ] Colors vibrant and appealing
- [ ] Text readable
- [ ] Buttons feel premium
- [ ] Hover effects work
- [ ] Loading states clear

### 9.3 UX Polish
- [ ] Clear feedback for all actions
- [ ] Error messages helpful
- [ ] Loading indicators present
- [ ] Success messages encouraging
- [ ] Tutorial/rules accessible
- [ ] Mobile-friendly

**Test Duration:** ~10 minutes  
**Notes:** _________________________________

---

## ✅ PHASE 10: Pre-Deployment Checklist

### 10.1 Code Quality
- [ ] No console errors
- [ ] No console warnings
- [ ] All tests pass (`npm test`)
- [ ] ESLint clean
- [ ] No TODO comments in production code

### 10.2 Environment
- [ ] `.env` file configured
- [ ] Environment variables documented
- [ ] Production URLs ready
- [ ] Smart contract deployed (if needed)
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Netlify

### 10.3 Documentation
- [ ] README.md complete
- [ ] Setup instructions clear
- [ ] API documented
- [ ] Game rules explained
- [ ] Deployment guide ready

---

## 📊 FINAL SUMMARY

**Total Test Duration:** ~2 hours  
**Tests Passed:** _____ / _____  
**Critical Issues:** _____  
**Minor Issues:** _____  

**Deployment Ready?** ☐ YES  ☐ NO  

**Tester Signature:** _____________  
**Date:** _____________  

---

## 🚀 DEPLOYMENT STEPS (After all tests pass)

1. **Backend (Railway)**
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Production ready"
   git push origin main
   
   # Deploy to Railway
   # Connect GitHub repo
   # Set environment variables
   # Deploy
   ```

2. **Frontend (Netlify)**
   ```bash
   # Build production
   npm run build
   
   # Deploy to Netlify
   # Connect GitHub repo
   # Set build command: npm run build
   # Set publish directory: dist
   # Deploy
   ```

3. **Post-Deployment Verification**
   - [ ] Production backend accessible
   - [ ] Production frontend loads
   - [ ] Can create Web3 match on production
   - [ ] Can complete full game on production

---

**Notes & Issues:**
_____________________________________________
_____________________________________________
_____________________________________________
