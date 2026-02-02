# 🎲 GoLudo - AAA Quality Ludo Game

A modern, web-based Ludo game built with React, TypeScript, and Web3 integration. Features local play, AI opponents, and blockchain-based multiplayer matches on the Flare Network.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

---

## ✨ Features

### 🎮 Game Modes
- **Classic Mode** - Traditional Ludo with 4 tokens per player
- **Fast Mode** - Quick games with 2 tokens and faster rules
- **Team Play** *(Coming Soon)* - 2v2 cooperative gameplay
- **Blitz** *(Coming Soon)* - Ultra-fast 5-minute matches
- **Tournament** *(Coming Soon)* - Ranked competitive play

### 🤖 Play Options
- **Local Multiplayer** - Play with friends on the same device
- **vs AI** - Challenge intelligent computer opponents
- **Web3 Match** - Blockchain-based multiplayer with stakes

### 🌟 Highlights
- ✅ **Mobile-First Design** - Optimized for smartphone gaming
- ✅ **AAA Code Quality** - TypeScript, clean architecture, comprehensive docs
- ✅ **Real-time Multiplayer** - Socket.IO powered gameplay
- ✅ **Web3 Integration** - Play for crypto on Flare Network
- ✅ **Smart AI** - Priority-based decision engine
- ✅ **USA Standard Rules** - Safe zones, blockades, captures

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/goludo.git
cd goludo

# Install dependencies
npm install

# Start development server
npm run dev

# In a separate terminal, start backend (for multiplayer)
cd backend
npm install
npm run dev
```

The game will open at `http://localhost:3000`

---

## 📁 Project Structure

```
goludo/
├── src/
│   ├── pages/              # Route-based pages
│   ├── components/         # Reusable UI components
│   │   ├── game/          # Game-specific components
│   │   ├── lobby/         # Lobby components
│   │   └── common/        # Shared components
│   ├── engine/            # Game logic (headless)
│   │   ├── rules/         # Game mode rules
│   │   ├── gameLogic.js   # Core game engine
│   │   └── aiEngine.js    # AI decision making
│   ├── store/             # Zustand state management
│   ├── hooks/             # Custom React hooks
│   ├── services/          # External services (API, Socket)
│   ├── types/             # TypeScript definitions
│   └── config/            # App configuration
│
├── backend/               # Multiplayer server
│   └── server.js          # Socket.IO + Express server
│
├── smart-contracts/       # Web3 contracts
│   └── LudoGame.sol       # Solidity contract
│
└── docs/                  # Documentation
    ├── REFACTORING_PLAN.md
    ├── PHASE_1_COMPLETE.md
    └── ...
```

---

## 🛠️ Setup & Deployment (Audit Readiness)

### Prerequisites
- Node.js >= 20.0.0
- npm or yarn
- A Flare/Coston2 RPC URL

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment:
   - Copy `.env.example` to `.env`
   - Fill in `FLARE_RPC_URL`, `LUDOVAULT_ADDRESS`, and `SERVER_SIGNER_PRIVATE_KEY`
4. Run in development:
   ```bash
   npm start
   ```
5. Run tests:
   ```bash
   npm test
   ```

### Security Considerations
- **Signer Key**: The `SERVER_SIGNER_PRIVATE_KEY` must be handled as a high-security secret. On Railway or other PaaS, use environment variables directly; never hardcode them.
- **On-Chain Verification**: The backend verifies every room creation and join transaction against the Flare blockchain to prevent spoofing.
- **Input Integrity**: All REST endpoints are protected by Zod schemas to prevent injection and malformed data.
- **Rate Limiting**: Critical endpoints (payouts, room creation) are rate-limited to prevent brute-force attacks.

### Recovery
In case of server restart, the backend automatically scans the Flare blockchain for active rooms using the `recoverActiveRoomsFromBlockchain` utility in `contractVerifier.js`.

---

## 🎯 Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **React Router v6** - Navigation
- **Socket.IO Client** - Real-time communication

### Backend
- **Node.js** - Runtime
- **Express** - Web server
- **Socket.IO** - WebSocket server
- **Ethers.js** - Web3 integration

### Blockchain
- **Solidity** - Smart contracts
- **Flare Network** - Blockchain platform
- **Hardhat** - Development environment

---

## 🎮 How to Play

### Local Game
1. Click **"Local Game"** on the home screen
2. Configure players (2-4)
3. Choose player names and colors
4. Click **"Start Game"**

### vs AI
1. Click **"vs Computer"**
2. Set your name and color
3. AI opponents are automatically configured
4. Click **"Start Game"**

### Web3 Match
1. Connect your wallet (MetaMask)
2. Click **"Web3 Match"**
3. Either:
   - Create a new room with a stake
   - Join an existing room
4. Wait for opponent to join
5. Play for crypto!

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs) folder:

- **[Refactoring Plan](./docs/REFACTORING_PLAN.md)** - Architecture overview
- **[Socket Events](./docs/SOCKET_EVENTS.md)** - Complete socket API reference for UI
- **[Phase 1 Complete](./docs/PHASE_1_COMPLETE.md)** - Current implementation status
- **[Mobile-First UI](./docs/MOBILE_FIRST_UI_IMPROVEMENTS.md)** - UI/UX improvements
- **[Turn Timer System](./docs/TURN_TIMER_IMPROVEMENTS.md)** - Timer implementation
- **[State Management](./docs/MULTIPLAYER_STATE_MANAGEMENT.md)** - Multiplayer patterns
- **[Testing Guide](./docs/TESTING_CHECKLIST.md)** - QA procedures


---

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Lint code
```

### Backend Scripts

```bash
cd backend
npm run dev          # Start backend server
npm run start        # Start production server
```

---

## 🏗️ Architecture Highlights

### Strategy Pattern for Game Modes
```typescript
const rules = getRulesForMode('fast');
if (rules.canStartWithRoll(5)) {
  // Fast mode allows starting with 5
}
```

### Zustand for Performance
```typescript
// Transient updates for animations
setIsRolling(true); // No parent re-renders!

// Selective subscriptions
const activePlayer = useGameStore(selectActivePlayer);
```

### Type-Safe Routing
```typescript
import { ROUTES } from '@config/routes';
navigate(ROUTES.GAME('room-123'));
```

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting PRs.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- Classic Ludo rules and gameplay
- Flare Network for Web3 infrastructure
- React and TypeScript communities
- All contributors and testers

---

## 📞 Contact

- **GitHub**: [Your GitHub Profile](https://github.com/your-username)
- **Twitter**: [@YourTwitter](https://twitter.com/your-twitter)
- **Email**: your.email@example.com

---

## 🗺️ Roadmap

### ✅ Phase 1 - Foundation (Complete)
- TypeScript migration
- Zustand state management
- React Router v6
- Game rules abstraction
- Type system

### 🚧 Phase 2 - Component Extraction (In Progress)
- Page-based routing
- Component separation
- Hook extraction
- Service layer

### 📋 Phase 3 - Game Modes
- Team Play mode
- Blitz mode
- Tournament mode
- Custom rules editor

### 📋 Phase 4 - Polish
- Animations & effects
- Sound design
- Achievement system
- Leaderboards

---

**Built with ❤️ for the Ludo community**

🎲 **Let's Play!** 🎲
