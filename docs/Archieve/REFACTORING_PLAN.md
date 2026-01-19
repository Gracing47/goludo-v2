# GoLudo - AAA Code Architecture Refactoring Plan

## 🎯 Ziel
Transformation der aktuellen Monolith-Struktur in eine skalierbare, wartbare **AAA-Qualität Codebase** mit:
- ✅ **Separation of Concerns** (SoC)
- ✅ **Page-based Routing** mit React Router v6
- ✅ **Modulare Komponenten-Architektur**
- ✅ **Vorbereitung für Game Modes** (Classic, Fast, etc.)
- ✅ **Best Practices 2024**

---

## 📊 Aktuelle Struktur - Analyse

### Probleme identifiziert:

#### 1. **App.jsx - Monolith (658 Zeilen)**
```
❌ Probleme:
- Lobby + Game Logic in einer Datei
- 658 Zeilen Code
- Gemischte Concerns (UI, State, Socket, Web3)
- Schwer zu testen
- Schwer zu erweitern (Game Modes)
```

#### 2. **Lobby.jsx - Multi-Purpose (558 Zeilen)**
```
❌ Probleme:
- Menu + Setup + Web3 Lobby + Waiting Room
- 4 verschiedene Screens in einer Komponente
- Komplexe State-Verwaltung
- Schwer zu navigieren
```

#### 3. **Fehlende Routing-Struktur**
```
❌ Probleme:
- Keine URL-basierte Navigation
- Kein Browser Back/Forward
- Kein Deep Linking
- Schwierige State-Persistierung
```

#### 4. **Keine Game Mode Abstraktion**
```
❌ Probleme:
- Game Rules hardcoded
- Keine Möglichkeit für Varianten
- Schwer erweiterbar
```

---

## 🏗️ Neue Architektur - AAA Standard

### Folder Structure (Best Practice 2024)

```
src/
├── pages/                    # Route-basierte Pages
│   ├── HomePage.jsx          # Landing/Menu
│   ├── GameSetupPage.jsx     # Player Configuration
│   ├── GamePage.jsx          # Active Game
│   ├── Web3LobbyPage.jsx     # Web3 Room Browser
│   ├── WaitingRoomPage.jsx   # Waiting for Players
│   └── GameModesPage.jsx     # Game Mode Selection (NEW)
│
├── components/               # Reusable UI Components
│   ├── layout/
│   │   ├── AppLayout.jsx     # Main Layout with Header/Footer
│   │   ├── GameLayout.jsx    # Game-specific Layout
│   │   └── LobbyLayout.jsx   # Lobby-specific Layout
│   │
│   ├── game/                 # Game-specific Components
│   │   ├── Board.jsx
│   │   ├── Token.jsx
│   │   ├── Dice.jsx
│   │   ├── PlayerCard.jsx    # Extracted from App.jsx
│   │   ├── TurnTimer.jsx     # Extracted from App.jsx
│   │   ├── GameControls.jsx  # Extracted from App.jsx
│   │   └── Commentator.jsx
│   │
│   ├── lobby/                # Lobby-specific Components
│   │   ├── ModeSelector.jsx  # Game Mode Selection
│   │   ├── PlayerSetup.jsx   # Player Configuration
│   │   ├── RoomCard.jsx      # Web3 Room Display
│   │   └── WalletInfo.jsx    # Wallet Display
│   │
│   └── common/               # Shared Components
│       ├── Button.jsx
│       ├── Modal.jsx
│       ├── LoadingSpinner.jsx
│       └── WalletButton.jsx
│
├── hooks/                    # Custom Hooks (Business Logic)
│   ├── useGame.js            # Game State Management
│   ├── useGameSocket.js      # Socket Logic (extracted)
│   ├── useGameTimer.js       # Timer Logic (extracted)
│   ├── useAI.js              # AI Logic (extracted)
│   ├── useLudoWeb3.js        # Web3 Logic (existing)
│   ├── usePlayerSetup.js     # Player Config Logic
│   └── useGameMode.js        # Game Mode Logic (NEW)
│
├── services/                 # External Services
│   ├── api/
│   │   ├── roomsApi.js       # Room CRUD operations
│   │   └── gameApi.js        # Game-related API calls
│   ├── socket/
│   │   └── socketService.js  # Centralized Socket.IO
│   └── deepseekService.js    # AI Service (existing)
│
├── engine/                   # Game Engine (existing)
│   ├── gameLogic.js
│   ├── aiEngine.js
│   ├── constants.js
│   ├── rules/                # NEW: Game Mode Rules
│   │   ├── classicRules.js
│   │   ├── fastRules.js
│   │   ├── teamRules.js
│   │   └── index.js
│   └── gameMode.js           # NEW: Game Mode Manager
│
├── config/                   # Configuration
│   ├── routes.jsx            # Centralized Routing
│   ├── gameModes.js          # Game Mode Definitions (NEW)
│   └── constants.js
│
├── context/                  # React Context (Global State)
│   ├── GameContext.jsx       # Game State Context
│   ├── Web3Context.jsx       # Web3 State Context
│   └── ThemeContext.jsx      # Theme/Settings Context
│
├── utils/                    # Utility Functions
│   ├── validation.js
│   ├── formatting.js
│   └── helpers.js
│
├── styles/                   # Global Styles
│   ├── globals.css
│   ├── variables.css
│   └── animations.css
│
├── App.jsx                   # Root Component (Routing only)
├── main.jsx                  # Entry Point
└── index.css                 # Base Styles
```

---

## 🔄 Migration Plan - Step by Step

### Phase 1: Setup & Infrastructure (Tag: v2.0-phase1)

#### Step 1.1: Install Dependencies
```bash
npm install react-router-dom@6
npm install zustand  # Optional: Lightweight state management
```

#### Step 1.2: Create Folder Structure
```bash
mkdir -p src/pages
mkdir -p src/components/{layout,game,lobby,common}
mkdir -p src/hooks
mkdir -p src/services/{api,socket}
mkdir -p src/engine/rules
mkdir -p src/config
mkdir -p src/context
mkdir -p src/utils
mkdir -p src/styles
```

#### Step 1.3: Create Routing Configuration
**File: `src/config/routes.jsx`**
```javascript
import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import HomePage from '../pages/HomePage';
import GameModesPage from '../pages/GameModesPage';
import GameSetupPage from '../pages/GameSetupPage';
import Web3LobbyPage from '../pages/Web3LobbyPage';
import WaitingRoomPage from '../pages/WaitingRoomPage';
import GamePage from '../pages/GamePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'modes',
        element: <GameModesPage />
      },
      {
        path: 'setup/:mode',
        element: <GameSetupPage />
      },
      {
        path: 'lobby/web3',
        element: <Web3LobbyPage />
      },
      {
        path: 'waiting/:roomId',
        element: <WaitingRoomPage />
      },
      {
        path: 'game/:gameId',
        element: <GamePage />
      }
    ]
  }
]);
```

---

### Phase 2: Extract Components (Tag: v2.0-phase2)

#### Step 2.1: Extract Layout Components

**File: `src/components/layout/AppLayout.jsx`**
```javascript
import { Outlet } from 'react-router-dom';

const AppLayout = () => {
  return (
    <div className="app">
      <Outlet />
    </div>
  );
};

export default AppLayout;
```

#### Step 2.2: Extract Game Components

**From App.jsx → Extract:**
1. **PlayerCard.jsx** (Lines 519-546)
2. **TurnTimer.jsx** (Lines 589-593)
3. **GameControls.jsx** (Lines 587-611)

**File: `src/components/game/PlayerCard.jsx`**
```javascript
import './PlayerCard.css';

const PlayerCard = ({ 
  player, 
  index, 
  isActive, 
  isMe, 
  isRolling, 
  isMoving 
}) => {
  const colorClass = `player-${player.color}`;
  
  return (
    <div className={`player-card ${colorClass} ${isActive ? 'active-turn' : ''} ${isMe ? 'is-me' : ''}`}>
      <div className="player-indicator" />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="player-name">
          {player.name}
          {player.isAI && ' 🤖'}
          {isMe && ' (You)'}
        </span>
        {isActive && (
          <span style={{ fontSize: '10px', opacity: 0.8 }}>
            {isRolling ? 'Rolling...' : isMoving ? 'Moving...' : 'Thinking...'}
          </span>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;
```

**File: `src/components/game/TurnTimer.jsx`**
```javascript
import './TurnTimer.css';

const TurnTimer = ({ seconds }) => {
  if (seconds === null || seconds <= 0) return null;
  
  return (
    <div className={`turn-timer ${seconds <= 3 ? 'urgent' : ''}`}>
      ⏱️ {seconds}s
    </div>
  );
};

export default TurnTimer;
```

#### Step 2.3: Extract Lobby Components

**From Lobby.jsx → Extract:**
1. **ModeSelector.jsx** (Lines 231-283)
2. **PlayerSetup.jsx** (Lines 386-450)
3. **RoomCard.jsx** (Lines 303-316)
4. **WalletInfo.jsx** (Lines 267-280)

---

### Phase 3: Extract Hooks (Tag: v2.0-phase3)

#### Step 3.1: Extract Socket Logic

**File: `src/hooks/useGameSocket.js`**
```javascript
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useGameSocket = (roomId, playerAddress) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serverMsg, setServerMsg] = useState(null);
  const [turnTimer, setTurnTimer] = useState(null);

  useEffect(() => {
    if (!roomId) return;

    const socket = io('http://localhost:3333');
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_match', { roomId, playerAddress });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('state_update', (update) => {
      if (update.msg) setServerMsg(update.msg);
      // Emit event for parent to handle
      window.dispatchEvent(new CustomEvent('game:state_update', { detail: update }));
    });

    socket.on('turn_timer_start', ({ playerIndex, timeoutMs, phase }) => {
      const timeoutSeconds = Math.floor(timeoutMs / 1000);
      setTurnTimer(timeoutSeconds);
    });

    socket.on('turn_timer_update', ({ remainingSeconds }) => {
      setTurnTimer(remainingSeconds);
    });

    socket.on('turn_timeout', ({ playerName }) => {
      setTurnTimer(0);
      setServerMsg(`⏰ ${playerName} timed out!`);
      setTimeout(() => setServerMsg(null), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, playerAddress]);

  const emit = (event, data) => {
    socketRef.current?.emit(event, data);
  };

  return {
    socket: socketRef.current,
    isConnected,
    serverMsg,
    turnTimer,
    emit
  };
};
```

#### Step 3.2: Extract Game Logic Hook

**File: `src/hooks/useGame.js`**
```javascript
import { useState, useCallback, useRef } from 'react';
import { createInitialState, rollDice, moveToken, completeMoveAnimation } from '../engine/gameLogic';

export const useGame = (gameConfig) => {
  const [gameState, setGameState] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const aiActionInProgress = useRef(false);

  const initializeGame = useCallback((config) => {
    const activeColors = config.players.map((_, index) => index);
    setGameState(createInitialState(config.playerCount, activeColors));
  }, []);

  const handleRoll = useCallback(() => {
    if (!gameState || gameState.gamePhase !== 'ROLL_DICE' || isRolling || isMoving) return;

    setIsRolling(true);
    setTimeout(() => {
      setGameState(prev => rollDice(prev));
      setIsRolling(false);
    }, 800);
  }, [gameState, isRolling, isMoving]);

  const executeMove = useCallback((move) => {
    if (!gameState || (gameState.gamePhase !== 'SELECT_TOKEN' && gameState.gamePhase !== 'BONUS_MOVE')) return;

    setIsMoving(true);
    setGameState(prev => moveToken(prev, move));

    setTimeout(() => {
      setGameState(prev => completeMoveAnimation(prev));
      setIsMoving(false);
      aiActionInProgress.current = false;
    }, 400);
  }, [gameState]);

  return {
    gameState,
    setGameState,
    isRolling,
    isMoving,
    aiActionInProgress,
    initializeGame,
    handleRoll,
    executeMove
  };
};
```

---

### Phase 4: Create Pages (Tag: v2.0-phase4)

#### Step 4.1: HomePage (Menu)

**File: `src/pages/HomePage.jsx`**
```javascript
import { useNavigate } from 'react-router-dom';
import { useLudoWeb3 } from '../hooks/useLudoWeb3';
import WalletButton from '../components/common/WalletButton';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const { account, balance, balanceSymbol } = useLudoWeb3();

  const handleModeSelect = (mode) => {
    if (mode === 'web3' && !account) {
      alert('Please connect your wallet first!');
      return;
    }
    
    if (mode === 'web3') {
      navigate('/lobby/web3');
    } else {
      navigate(`/setup/${mode}`);
    }
  };

  return (
    <div className="home-page">
      <div className="home-container">
        <header className="home-header">
          <h1 className="home-title">GoLudo</h1>
          <p className="home-subtitle">Classic Board Game</p>
        </header>

        <div className="mode-menu">
          <button className="mode-button primary" onClick={() => handleModeSelect('local')}>
            <span className="mode-icon">👥</span>
            <span className="mode-text">
              <strong>Local Game</strong>
              <small>Play with friends offline</small>
            </span>
          </button>

          <button className="mode-button secondary" onClick={() => handleModeSelect('ai')}>
            <span className="mode-icon">🤖</span>
            <span className="mode-text">
              <strong>vs Computer</strong>
              <small>Challenge the AI</small>
            </span>
          </button>

          <button className="mode-button web3" onClick={() => handleModeSelect('web3')}>
            <span className="mode-icon">🔗</span>
            <span className="mode-text">
              <strong>Web3 Match</strong>
              <small>Play on Flare Network</small>
            </span>
          </button>

          <button className="mode-button modes" onClick={() => navigate('/modes')}>
            <span className="mode-icon">🎮</span>
            <span className="mode-text">
              <strong>Game Modes</strong>
              <small>Classic, Fast, Team Play</small>
            </span>
          </button>
        </div>

        <div className="wallet-section">
          {account ? (
            <div className="wallet-info">
              <p className="balance-text">
                Balance: <span>{parseFloat(balance).toLocaleString()} {balanceSymbol || '$GO'}</span>
              </p>
            </div>
          ) : (
            <p className="wallet-hint">Connect wallet for Web3 features</p>
          )}
          <WalletButton />
        </div>

        <footer className="home-footer">
          <p>USA Standard Rules • Safe Zones • Blockades</p>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
```

#### Step 4.2: GameModesPage (NEW)

**File: `src/pages/GameModesPage.jsx`**
```javascript
import { useNavigate } from 'react-router-dom';
import { GAME_MODES } from '../config/gameModes';
import './GameModesPage.css';

const GameModesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="game-modes-page">
      <div className="modes-container">
        <header className="modes-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            ← Back
          </button>
          <h1 className="modes-title">Game Modes</h1>
        </header>

        <div className="modes-grid">
          {GAME_MODES.map(mode => (
            <div key={mode.id} className={`mode-card ${mode.available ? '' : 'disabled'}`}>
              <div className="mode-icon-large">{mode.icon}</div>
              <h3 className="mode-name">{mode.name}</h3>
              <p className="mode-description">{mode.description}</p>
              
              <div className="mode-features">
                {mode.features.map((feature, idx) => (
                  <span key={idx} className="feature-tag">{feature}</span>
                ))}
              </div>

              {mode.available ? (
                <button 
                  className="mode-select-btn"
                  onClick={() => navigate(`/setup/local?mode=${mode.id}`)}
                >
                  Play {mode.name}
                </button>
              ) : (
                <span className="coming-soon">Coming Soon</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GameModesPage;
```

#### Step 4.3: GamePage (Active Game)

**File: `src/pages/GamePage.jsx`**
```javascript
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { useGameSocket } from '../hooks/useGameSocket';
import Board from '../components/game/Board';
import Token from '../components/game/Token';
import PlayerCard from '../components/game/PlayerCard';
import TurnTimer from '../components/game/TurnTimer';
import GameControls from '../components/game/GameControls';
import './GamePage.css';

const GamePage = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  
  // Game logic hook
  const {
    gameState,
    isRolling,
    isMoving,
    handleRoll,
    executeMove
  } = useGame();

  // Socket hook (if web3 mode)
  const { turnTimer, serverMsg } = useGameSocket(gameId);

  const handleBackToMenu = () => {
    navigate('/');
  };

  if (!gameState) return <div>Loading...</div>;

  return (
    <div className="game-page">
      <div className="game-container">
        <Board>
          {/* Render tokens */}
        </Board>

        <div className="game-sidebar">
          <header className="game-header">
            <h1 className="game-title">GoLudo</h1>
          </header>

          <div className="players-list">
            {/* Render player cards */}
          </div>

          {serverMsg && <div className="server-msg">{serverMsg}</div>}

          <GameControls
            gameState={gameState}
            isRolling={isRolling}
            isMoving={isMoving}
            onRoll={handleRoll}
            turnTimer={turnTimer}
          />

          <button className="menu-btn" onClick={handleBackToMenu}>
            Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
```

---

### Phase 5: Game Modes System (Tag: v2.0-phase5)

#### Step 5.1: Define Game Modes

**File: `src/config/gameModes.js`**
```javascript
export const GAME_MODES = [
  {
    id: 'classic',
    name: 'Classic',
    icon: '🎲',
    description: 'Traditional Ludo rules with safe zones and blockades',
    features: ['4 Players', 'Safe Zones', 'Blockades', 'Bonus Turns'],
    rules: 'classicRules',
    available: true
  },
  {
    id: 'fast',
    name: 'Fast Mode',
    icon: '⚡',
    description: 'Quick games with 2 tokens per player and faster movement',
    features: ['2 Tokens', 'Double Dice', 'No Blockades', '10min Games'],
    rules: 'fastRules',
    available: true
  },
  {
    id: 'team',
    name: 'Team Play',
    icon: '👥',
    description: '2v2 team battles with shared victory',
    features: ['2v2 Teams', 'Shared Goal', 'Team Strategy', 'Voice Chat'],
    rules: 'teamRules',
    available: false
  },
  {
    id: 'blitz',
    name: 'Blitz',
    icon: '💨',
    description: 'Ultra-fast 5-minute matches with special power-ups',
    features: ['5min Timer', 'Power-ups', '1 Token', 'Speed Boost'],
    rules: 'blitzRules',
    available: false
  },
  {
    id: 'tournament',
    name: 'Tournament',
    icon: '🏆',
    description: 'Competitive ranked matches with ELO rating',
    features: ['Ranked', 'ELO System', 'Leaderboards', 'Rewards'],
    rules: 'tournamentRules',
    available: false
  }
];

export const getGameMode = (modeId) => {
  return GAME_MODES.find(mode => mode.id === modeId) || GAME_MODES[0];
};
```

#### Step 5.2: Create Rule Variants

**File: `src/engine/rules/classicRules.js`**
```javascript
export const classicRules = {
  tokensPerPlayer: 4,
  startingPosition: 'IN_YARD',
  diceRollsToStart: [6],
  bonusTurnOn: [6],
  maxConsecutiveSixes: 3,
  safeZonesEnabled: true,
  blockadesEnabled: true,
  captureEnabled: true,
  captureBonus: 'BONUS_MOVE',
  winCondition: 'ALL_TOKENS_HOME',
  turnTimeLimit: 10000 // 10 seconds
};
```

**File: `src/engine/rules/fastRules.js`**
```javascript
export const fastRules = {
  tokensPerPlayer: 2,
  startingPosition: 'IN_YARD',
  diceRollsToStart: [6, 5, 4], // Easier to start
  bonusTurnOn: [6],
  maxConsecutiveSixes: 2,
  safeZonesEnabled: true,
  blockadesEnabled: false, // No blockades
  captureEnabled: true,
  captureBonus: 'EXTRA_ROLL',
  winCondition: 'ALL_TOKENS_HOME',
  turnTimeLimit: 5000, // 5 seconds
  doubleDice: true // Roll 2 dice, pick one
};
```

#### Step 5.3: Game Mode Manager

**File: `src/engine/gameMode.js`**
```javascript
import { classicRules } from './rules/classicRules';
import { fastRules } from './rules/fastRules';

const RULES_MAP = {
  classic: classicRules,
  fast: fastRules
};

export class GameModeManager {
  constructor(modeId = 'classic') {
    this.mode = modeId;
    this.rules = RULES_MAP[modeId] || classicRules;
  }

  getRules() {
    return this.rules;
  }

  canStartWithRoll(diceValue) {
    return this.rules.diceRollsToStart.includes(diceValue);
  }

  grantsBonusTurn(diceValue) {
    return this.rules.bonusTurnOn.includes(diceValue);
  }

  isBlockadeAllowed() {
    return this.rules.blockadesEnabled;
  }

  getCaptureBonus() {
    return this.rules.captureBonus;
  }

  getTurnTimeLimit() {
    return this.rules.turnTimeLimit;
  }
}

export default GameModeManager;
```

---

## 📋 Migration Checklist

### Phase 1: Infrastructure ✅
- [ ] Install React Router v6
- [ ] Create folder structure
- [ ] Setup routing configuration
- [ ] Create AppLayout component

### Phase 2: Component Extraction ✅
- [ ] Extract PlayerCard component
- [ ] Extract TurnTimer component
- [ ] Extract GameControls component
- [ ] Extract ModeSelector component
- [ ] Extract PlayerSetup component
- [ ] Extract RoomCard component
- [ ] Extract WalletInfo component

### Phase 3: Hook Extraction ✅
- [ ] Extract useGameSocket hook
- [ ] Extract useGame hook
- [ ] Extract useAI hook
- [ ] Extract usePlayerSetup hook
- [ ] Create useGameMode hook

### Phase 4: Page Creation ✅
- [ ] Create HomePage
- [ ] Create GameModesPage
- [ ] Create GameSetupPage
- [ ] Create Web3LobbyPage
- [ ] Create WaitingRoomPage
- [ ] Create GamePage

### Phase 5: Game Modes ✅
- [ ] Define game modes config
- [ ] Create classic rules
- [ ] Create fast rules
- [ ] Create GameModeManager
- [ ] Integrate with game engine

### Phase 6: Testing & Polish ✅
- [ ] Test all routes
- [ ] Test game modes
- [ ] Test navigation flow
- [ ] Update documentation
- [ ] Performance optimization

---

## 🎯 Benefits After Refactoring

### Code Quality
- ✅ **Single Responsibility**: Each component has one job
- ✅ **Testability**: Isolated components easy to test
- ✅ **Maintainability**: Clear structure, easy to find code
- ✅ **Scalability**: Easy to add new features/modes

### Developer Experience
- ✅ **Navigation**: URL-based routing with browser back/forward
- ✅ **Deep Linking**: Share direct links to game rooms
- ✅ **Hot Reload**: Faster development with isolated components
- ✅ **Code Reuse**: Shared components across pages

### User Experience
- ✅ **Better Performance**: Code splitting, lazy loading
- ✅ **Smoother Navigation**: No full page reloads
- ✅ **Game Modes**: Multiple ways to play
- ✅ **Professional Feel**: AAA-quality architecture

---

## 📊 Metrics Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| App.jsx Lines | 658 | ~100 | -85% |
| Lobby.jsx Lines | 558 | ~50 | -91% |
| Total Components | 6 | 20+ | +233% |
| Reusable Hooks | 1 | 6+ | +500% |
| Pages | 0 | 6 | ∞ |
| Game Modes | 1 | 5 | +400% |
| Code Duplication | High | Low | -70% |

---

## 🚀 Next Steps

1. **Review this plan** - Approve architecture
2. **Start Phase 1** - Setup infrastructure
3. **Incremental Migration** - One phase at a time
4. **Test Each Phase** - Ensure nothing breaks
5. **Deploy v2.0** - AAA-quality codebase ready

---

## ❓ Questions to Answer

1. **Routing**: React Router v6 oder alternative?
2. **State Management**: Context API oder Zustand/Redux?
3. **Game Modes**: Welche Modi zuerst implementieren?
4. **Testing**: Unit Tests mit Vitest einführen?
5. **TypeScript**: Migration zu TypeScript gewünscht?

---

**Ready to transform GoLudo into AAA-quality code?** 🎮✨
