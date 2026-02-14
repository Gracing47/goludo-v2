# Task: Sparse Array & Sync Stability Fix

## Status
- **Priority:** Critical
- **Objective:** Fix the "Winner not detected" and "Sync loop/hang" issues caused by the new sparse player array logic ([null, null, null, null]).

## Phase 1: Engine Hardening
- [ ] **gameLogic.js:** Update `checkWinner` to iterate over `activeColors` instead of `0...playerCount`.
- [ ] **gameLogic.js:** Update `createInitialState` to ensure `tokens` array always has 4 slots to prevent out-of-bounds access.

## Phase 2: App.jsx Web3 Lifecycle Fix
- [ ] **playerCount Sync:** Ensure `playerCount` in `gameConfig` reflects the active player count (e.g., 2), not the array length (4).
- [ ] **Active Colors Sync:** Verify `activeColors` mapping matches the backend's logic exactly.
- [ ] **isLocalPlayerTurn Safety:** Add null-checks for `currentPlayer` to avoid crashes during transitions.
- [ ] **Socket Logic:** Ensure `onGameStart` is robust against double-calls during reconnect.

## Phase 3: Verification
- [ ] Test 2-player match with Red (Idx 0) vs Blue (Idx 3).
- [ ] Verify Win condition triggers for both players.
- [ ] Verify turn timer correctly displays and times out.
