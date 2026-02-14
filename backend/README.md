# GoLudo Backend Signer

## Overview
This service acts as the **Oracle** for the GoLudo Smart Contract. It determines the game outcome and provides a cryptographic proof (signature) to the winner, allowing them to claim their funds from the `LudoVault` contract.

## Security Flow
1. **Game Over**: The server detects a player has reached the final square.
2. **Verification**: Server checks if the move was valid and if a wager exists for this room.
3. **Signing**: Server uses its private key to sign an EIP-712 payload:
   - `roomId`: Unique ID of the match.
   - `winner`: Wallet address of the player.
   - `amount`: Total pot to be paid out.
   - `nonce`: Random 32-byte value to prevent replay attacks.
   - `deadline`: Expiration time (1 hour).
4. **Payout**: The frontend receives this proof and calls `vault.claimPayout(...)`.

## Setup
1. Fill `SERVER_SIGNER_PRIVATE_KEY` in the root `.env`.
2. Ensure `LUDOVAULT_ADDRESS` in `.env` matches the deployed contract.
3. The address derived from this key MUST be set as the `signer` in the smart contract (this is done automatically during deployment).

## Usage
```javascript
const { signPayout } = require('./signer');

// After game ends
const payoutProof = await signPayout(
    "0x...room_id", 
    "0x...winner_wallet", 
    "200000000000000000000" // 200 $GO in wei
);

// Send payoutProof to the winner's frontend
socket.emit('game_over', payoutProof);
```

## Testing
Run the signer directly to generate a sample signature:
```bash
node signer.js
```
