# Web3 Match Sync & Countdown - Task List

> **Goal:** Fix Web3 match state synchronization and add pre-game countdown
> **Created:** 2024-01-24
> **Status:** IN PROGRESS

---

## 🚨 REPORTED ISSUES

### Issue 1: State Not Syncing to Other Players
**Status:** 🔴 BLOCKING

**Problem:**
- First dice roll works for active player
- Other players don't receive the state update
- Game appears "stuck" for non-active players

**Root Cause Analysis:**
1. **Socket Join Race Condition**: When `game_started` is emitted (line 464), some players may not yet have their socketId linked to the room
2. **broadcastState emits to room**: Uses `io.to(room.id).emit()`, but players must be in the socket room first
3. **5-second delay** (line 470) is meant to fix this, but may not be enough or may cause other issues

**Investigation Points:**
- [ ] Verify all players have joined socket room before game starts
- [ ] Check if `join_match` is being emitted correctly from client
- [ ] Add logging to verify socket room membership

---

### Issue 2: Pre-Game Countdown Requested
**Status:** 🟡 FEATURE

**Request:**
- 5-second countdown before game starts
- Board animates into view
- Board rotates to correct player perspective
- Makes transition smoother and gives players time to prepare

**Implementation Plan:**
1. [ ] Create `GameCountdown` component
2. [ ] Server sends `game_countdown` event before `game_started`
3. [ ] Client plays countdown animation (5, 4, 3, 2, 1, GO!)
4. [ ] Board rotation animation during countdown
5. [ ] After countdown, normal game flow begins

---

## 🔧 PROPOSED FIXES

### Fix A: Ensure Socket Linking Before Game Start

**Current Flow (Problematic):**
```
Client A creates room → API call
Client B joins room → API call
Room is full → Server emits game_started immediately
→ Clients receive game_started, try to emit join_match
→ Server may have already started turn logic before join_match received
```

**Proposed Flow:**
```
Client A creates room → API call
Client B joins room → API call
Room is full → Server emits pre_game_countdown (5s)
→ Clients receive countdown, emit join_match, show countdown UI
→ After 5s, Server emits game_started
→ Server confirms all players are socket-linked
→ Turn timer begins
```

---

### Fix B: Add Confirmation Before Turn Start

**In `server.js` line 470:**
```javascript
// WAIT for socket confirmations before starting
const waitForSockets = setInterval(() => {
    const allConnected = room.players.every(p => p.socketId);
    if (allConnected) {
        clearInterval(waitForSockets);
        handleNextTurn(io, room);
    }
}, 500);

// Fallback timeout after 10s
setTimeout(() => {
    clearInterval(waitForSockets);
    handleNextTurn(io, room); // Start anyway with bots
}, 10000);
```

---

## 📋 IMPLEMENTATION ORDER

### Phase 1: Critical Sync Fix
1. [ ] Add socket connection verification in server
2. [ ] Emit `all_players_ready` event when all sockets linked
3. [ ] Client waits for `all_players_ready` before showing game

### Phase 2: Countdown Feature
4. [ ] Create `GameCountdown.tsx` component
5. [ ] Add countdown state to App.jsx
6. [ ] Server emits `pre_game_countdown` with 5s timer
7. [ ] Animate board rotation during countdown
8. [ ] Start normal game after countdown

### Phase 3: Polish
9. [ ] Add sound effects for countdown
10. [ ] Smooth transitions
11. [ ] Error handling for disconnects during countdown

---

## 📊 FILES TO MODIFY

| File | Changes |
|------|---------|
| `backend/server.js` | Socket verification, countdown event |
| `src/App.jsx` | Handle countdown state, new event listener |
| `src/components/GameCountdown.tsx` | NEW - Countdown overlay component |
| `src/components/GameCountdown.css` | NEW - Countdown styles |

---

*Last Updated: 2024-01-24 17:58*
