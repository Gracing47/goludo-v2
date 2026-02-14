# 🎮 $GOLudo Socket Events Reference

> **Version:** 1.0  
> **Last Updated:** February 2026  
> **Purpose:** Complete reference for all socket events used in the game UI

---

## 📡 Connection Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `connect` | Server → Client | - | Connection established successfully |
| `disconnect` | Server → Client | `reason: string` | Connection lost. Reasons: `"io server disconnect"`, `"transport close"`, `"ping timeout"` |
| `reconnect_attempt` | Engine | `attempt: number` | Automatic reconnection attempt |
| `reconnect` | Engine | `attempt: number` | Successfully reconnected |

---

## 🎲 Game Flow Events

### Room & Setup

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `room_update` | Server → Client | `Room` object | Room state changed (player joined, left, etc.) |
| `room_full` | Server → Client | `{ roomId, players }` | Room reached max players, countdown starting |
| `pre_game_countdown` | Server → Client | `{ room, countdownSeconds, message }` | Pre-game countdown started (3-5 seconds) |
| `countdown_tick` | Server → Client | `{ remaining: number }` | Countdown tick (every second) |
| `game_started` | Server → Client | `Room` object with `gameState` | Game has officially started, render the board |

### Gameplay

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `dice_rolled` | Server → Client | `{ value: number, playerIndex: number }` | A player rolled the dice |
| `state_update` | Server → Client | Partial `GameState` | Authoritative game state update (tokens, activePlayer, gamePhase, etc.) |
| `turn_timer_start` | Server → Client | `{ expiresAt: number }` | Turn timer started (unix timestamp in ms) |
| `player_skip` | Server → Client | `{ playerIndex, reason, skipCount }` | Player's turn was skipped (AFK, disconnect, no moves) |
| `player_forfeited` | Server → Client | `{ playerIndex, reason }` | Player forfeited (3 skips reached) |

### End Game

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `game_won` | Server → Client | `{ winner: number, reason: string }` | Game ended, winner determined |
| `game_error` | Server → Client | `{ message: string }` | Error occurred (invalid move, etc.) |

---

## 📤 Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ roomId, playerAddress, name, color }` | Request to join a room |
| `roll_dice` | `{ roomId }` | Request to roll dice (only valid on your turn) |
| `move_token` | `{ roomId, tokenIndex }` | Request to move a specific token |

---

## 🔄 State Update Payload

The `state_update` event contains a partial `GameState` object:

```typescript
interface StateUpdate {
    // Core State
    tokens?: number[][];           // [playerIdx][tokenIdx] = position
    activePlayer?: number;         // 0-3, whose turn it is
    diceValue?: number;            // 1-6, last rolled value
    gamePhase?: GamePhase;         // 'ROLL_DICE' | 'SELECT_TOKEN' | 'BONUS_MOVE' | 'WIN'
    
    // Win Condition
    winner?: number;               // Index of winning player (0-3)
    
    // Valid Moves (for SELECT_TOKEN phase)
    validMoves?: Array<{
        tokenIndex: number;
        from: number;
        to: number;
        captures?: boolean;
    }>;
    
    // Player Metadata
    playersMetadata?: Array<{
        skipCount: number;         // 0-3 skips
        forfeited: boolean;        // True if player forfeited
        lastActive: number;        // Unix timestamp
    }>;
    
    // Message
    msg?: string;                  // Optional server message to display
}
```

---

## 🎨 UI Implementation Guide

### Turn Timer
```javascript
socket.on('turn_timer_start', ({ expiresAt }) => {
    // Calculate remaining time client-side
    const remaining = Math.floor((expiresAt - Date.now()) / 1000);
    // Update every second locally (no socket spam)
});
```

### Player Skip Indicator
```javascript
// Show skip dots (3 dots, fill based on skipCount)
const metadata = gameState.playersMetadata?.[playerIndex];
const skipCount = metadata?.skipCount || 0;
// Render: ●●○ (2 skips)
```

### Win/Lose Detection
```javascript
const amIWinner = gameConfig.mode === 'web3'
    ? winnerPlayer?.address?.toLowerCase() === account?.address?.toLowerCase()
    : !winnerPlayer?.isAI;

// Winner: Play 'win' sound, show confetti, display claim button
// Loser: Play 'lose' sound, no confetti, show "Back to Lobby"
```

---

## 🔒 Security Notes

1. **Server is Authoritative** - All game logic runs on the server. Client events are requests, not commands.
2. **Turn Validation** - Server ignores `roll_dice` and `move_token` if it's not the player's turn.
3. **Signature Verification** - Payout claims require a server-signed EIP-712 signature.

---

## 📱 Mobile Considerations

- **Connection Drops** - Mobile users may experience frequent disconnects. The UI handles `reconnect_attempt` and `reconnect` events gracefully.
- **Background Tab** - When the tab is backgrounded, timers may drift. Always use `expiresAt` timestamps for accurate countdown.
