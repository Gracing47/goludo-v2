# GoLudo Smart Contracts

## Overview

Production-ready smart contracts for the GoLudo P2P wagering platform on Flare Network.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                    Thirdweb SDK + Wallet Connect                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js)                           │
│              Game Logic • Matchmaking • EIP-712 Signing          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FLARE BLOCKCHAIN                              │
│  ┌─────────────┐    ┌─────────────────────────────────────────┐ │
│  │  GoToken    │    │            LudoVault                     │ │
│  │  (ERC-20)   │◄───│  • Room Management                       │ │
│  │             │    │  • Escrow Deposits                       │ │
│  │  • Faucet   │    │  • EIP-712 Payout Verification           │ │
│  │  • Mint     │    │  • Emergency Withdraw (24h)              │ │
│  └─────────────┘    └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Contracts

### 1. GoToken.sol
Simple ERC-20 token for the GoLudo platform (Testnet version with faucet).

| Feature | Description |
|---------|-------------|
| Standard | ERC-20 (OpenZeppelin v5) |
| Max Supply | 1,000,000,000 GO |
| Faucet | 1000 GO per claim, 1 hour cooldown |
| Access | Ownable2Step (secure ownership transfer) |

### 2. LudoVault.sol
Escrow vault for P2P wager games.

| Feature | Description |
|---------|-------------|
| Deposits | ERC-20 only (use WFLR for native) |
| Room Lifecycle | EMPTY → WAITING → ACTIVE → FINISHED/CANCELLED |
| Payout Auth | EIP-712 server signature |
| Fee | Configurable 0-10% (basis points) |
| Emergency | 24h delay then both players can withdraw |
| Security | ReentrancyGuard, CEI Pattern, Ownable2Step |

## Deployment

### Prerequisites
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

### Networks
| Network | Chain ID | RPC |
|---------|----------|-----|
| Coston2 (Testnet) | 114 | https://coston2-api.flare.network/ext/C/rpc |
| Flare (Mainnet) | 14 | https://flare-api.flare.network/ext/C/rpc |

### Deploy Steps
1. Configure `hardhat.config.js` with Flare networks
2. Deploy GoToken with initial supply
3. Deploy LudoVault with token address, signer, treasury, fee
4. Verify contracts on Flare Explorer

## Security Checklist

- [x] Solidity 0.8.25 (overflow protection built-in)
- [x] OpenZeppelin v5 contracts
- [x] ReentrancyGuard on all external functions
- [x] Checks-Effects-Interactions pattern
- [x] Ownable2Step (2-step ownership transfer)
- [x] EIP-712 typed signatures
- [x] Emergency withdraw (24h delay)
- [x] Max fee cap (10%)
- [x] Custom errors (gas efficient)
- [x] Event emission for all state changes

## User Flow

```
1. User A: approve(vault, amount)
2. User A: createRoom(roomId, amount)
3. User B: approve(vault, amount)
4. User B: joinRoom(roomId)
5. [Off-chain game plays]
6. Server: sign(winner, amount) → EIP-712
7. Winner: claimPayout(roomId, signature)
```

## License

MIT
