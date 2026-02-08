/**
 * Core Type Definitions for GoLudo
 * 
 * This file contains all shared types used across the application.
 * Following AAA standards with strict typing and comprehensive documentation.
 */

/* ============================================
   PLAYER TYPES
   ============================================ */

import type { Socket } from 'socket.io-client';
export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type PlayerType = 'human' | 'ai';

export interface Player {
    /** Unique player identifier (0-3) */
    id: number;

    /** Display name */
    name: string;

    /** Player color */
    color: PlayerColor;

    /** Player type (human or AI) */
    type: PlayerType;

    /** Legacy flag for AI (deprecated) */
    isAI?: boolean;

    /** Web3 wallet address (optional, only for web3 mode) */
    address?: string;

    /** Socket ID for multiplayer (optional) */
    socketId?: string;
}

/* ============================================
   GAME MODE TYPES
   ============================================ */

export type GameModeId = 'classic' | 'fast' | 'team' | 'blitz' | 'tournament';

export type GameType = 'local' | 'ai' | 'web3';

export interface GameMode {
    /** Unique mode identifier */
    id: GameModeId;

    /** Display name */
    name: string;

    /** Icon emoji */
    icon: string;

    /** Description text */
    description: string;

    /** Feature list */
    features: string[];

    /** Rule set identifier */
    rules: string;

    /** Whether mode is available */
    available: boolean;
}

/* ============================================
   GAME STATE TYPES
   ============================================ */

export type GamePhase =
    | 'COUNTDOWN'
    | 'ROLL_DICE'
    | 'SELECT_TOKEN'
    | 'BONUS_MOVE'
    | 'ANIMATING'
    | 'WIN';

export type TokenPosition = number | 'IN_YARD' | 'FINISHED';

export interface TokenState {
    /** Current position on board */
    position: TokenPosition;

    /** Whether token is safe from capture */
    isSafe: boolean;

    /** Whether token is in a blockade */
    isBlocking: boolean;
}

export interface GameState {
    /** Current active player index (0-3) */
    activePlayer: number;

    /** Current game phase */
    gamePhase: GamePhase;

    /** Last dice roll value (1-6) */
    diceValue: number | null;

    /** Token positions for all players [player][token] */
    tokens: TokenPosition[][];

    /** Valid moves for current player */
    validMoves: Move[];

    /** Consecutive sixes rolled */
    consecutiveSixes: number;

    /** Bonus moves remaining */
    bonusMoves: number;

    /** Active player colors */
    activeColors: number[];

    /** Winner player index (if game is won) */
    winner: number | null;

    /** Game message */
    message: string;
}

export interface Capture {
    /** Index of the player whose token was captured */
    player: number;
    /** Index of the token that was captured */
    tokenIndex: number;
}

export interface Move {
    /** Token index to move */
    tokenIndex: number;

    /** Starting position (0-51, 100-105, or constant) */
    fromPosition: TokenPosition;

    /** Ending position (0-51, 100-105, or constant) */
    toPosition: TokenPosition;

    /** List of captures made by this move */
    captures: Capture[];

    /** Whether move captures opponent (legacy flag) */
    isCapture?: boolean;

    /** Whether move is a spawn from yard */
    isSpawn?: boolean;

    /** Whether move reaches home goal */
    isHome?: boolean;

    /** Full path of steps for animation */
    traversePath?: TokenPosition[];

    /** Whether move grants bonus turn */
    grantsBonus?: boolean;
}

/* ============================================
   GAME CONFIGURATION TYPES
   ============================================ */

export interface GameConfig {
    /** Game type (local, ai, web3) */
    mode: GameType;

    /** Game mode variant */
    gameMode: GameModeId;

    /** Number of players (2-4) */
    playerCount: number;

    /** Player configurations */
    players: Player[];

    /** Room ID for multiplayer */
    roomId?: string;

    /** Stake amount for web3 games */
    stake?: string;
}

/* ============================================
   GAME RULES INTERFACE
   ============================================ */

export interface IGameRules {
    /** Number of tokens per player */
    readonly tokensPerPlayer: number;

    /** Starting position for tokens */
    readonly startingPosition: TokenPosition;

    /** Dice values that allow starting */
    readonly diceRollsToStart: number[];

    /** Dice values that grant bonus turn */
    readonly bonusTurnOn: number[];

    /** Maximum consecutive sixes allowed */
    readonly maxConsecutiveSixes: number;

    /** Whether safe zones are enabled */
    readonly safeZonesEnabled: boolean;

    /** Whether blockades are enabled */
    readonly blockadesEnabled: boolean;

    /** Whether capturing is enabled */
    readonly captureEnabled: boolean;

    /** Bonus granted on capture */
    readonly captureBonus: 'BONUS_MOVE' | 'EXTRA_ROLL' | 'NONE';

    /** Win condition */
    readonly winCondition: 'ALL_TOKENS_HOME' | 'FIRST_TOKEN_HOME';

    /** Turn time limit in milliseconds */
    readonly turnTimeLimit: number;

    /** Whether double dice is enabled (Fast mode) */
    readonly doubleDice?: boolean;

    /**
     * Check if player can start with given dice roll
     */
    canStartWithRoll(diceValue: number): boolean;

    /**
     * Check if dice value grants bonus turn
     */
    grantsBonusTurn(diceValue: number): boolean;

    /**
     * Check if blockades are allowed
     */
    isBlockadeAllowed(): boolean;

    /**
     * Get capture bonus type
     */
    getCaptureBonus(): 'BONUS_MOVE' | 'EXTRA_ROLL' | 'NONE';

    /**
     * Get turn time limit
     */
    getTurnTimeLimit(): number;
}

/* ============================================
   WEB3 TYPES
   ============================================ */

export interface Web3Account {
    /** Wallet address */
    address: string;

    /** Balance in native token */
    balance: string;

    /** Token symbol */
    balanceSymbol: string;
}

export interface Room {
    /** Unique room identifier */
    id: string;

    /** Stake amount */
    stake: string;

    /** Maximum players */
    maxPlayers: number;

    /** Current players */
    players: Player[];

    /** Room status */
    status: 'WAITING' | 'STARTING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';

    /** Game state (if active) */
    gameState?: GameState;
}

/* ============================================
   SOCKET EVENT TYPES
   ============================================ */

export interface SocketEvents {
    // Client -> Server
    'join_match': { roomId: string; playerAddress: string; playerColor?: string };
    'roll_dice': { roomId: string; playerAddress: string };
    'move_token': { roomId: string; playerAddress: string; tokenIndex: number };

    // Server -> Client
    'state_update': GameState;
    'dice_rolled': { value: number; playerIndex: number };
    'game_started': Room;
    'turn_timer_start': { playerIndex: number; timeoutMs: number; phase: GamePhase };
    'turn_timer_update': { playerIndex: number; remainingSeconds: number; phase: GamePhase };
    'turn_timeout': { playerIndex: number; playerName: string; phase: GamePhase };
}

/* ============================================
   UTILITY TYPES
   ============================================ */

export interface Coordinates {
    /** Row index (0-14) */
    r: number;

    /** Column index (0-14) */
    c: number;
}

export type CellType =
    | 'empty'
    | 'path'
    | 'safe'
    | 'start-red'
    | 'start-green'
    | 'start-yellow'
    | 'start-blue'
    | 'home-red'
    | 'home-green'
    | 'home-yellow'
    | 'home-blue'
    | 'base-red'
    | 'base-green'
    | 'base-yellow'
    | 'base-blue'
    | 'center';

/* ============================================
   STORE TYPES
   ============================================ */

export interface LobbyState {
    /** Current lobby step */
    step: 'menu' | 'setup' | 'web3-lobby' | 'waiting';

    /** Selected game mode */
    gameMode: GameType | null;

    /** Selected game mode variant */
    gameModeVariant: GameModeId;

    /** Player count */
    playerCount: number;

    /** Player configurations */
    players: Player[];

    /** Bet amount for web3 */
    betAmount: string;

    /** Open rooms for web3 */
    openRooms: Room[];

    /** Waiting room ID */
    waitingRoomId: string | null;

    /** Selected room for joining */
    selectedRoom: Room | null;

    /** Actions */
    setStep: (step: LobbyState['step']) => void;
    setGameMode: (mode: GameType) => void;
    setGameModeVariant: (variant: GameModeId) => void;
    setPlayerCount: (count: number) => void;
    updatePlayer: (index: number, updates: Partial<Player>) => void;
    setBetAmount: (amount: string) => void;
    setOpenRooms: (rooms: Room[]) => void;
    setWaitingRoomId: (id: string | null) => void;
    setSelectedRoom: (room: Room | null) => void;
    reset: () => void;
}

export interface PayoutProof {
    /** Room ID */
    roomId: string;
    /** Winner address */
    winner: string;
    /** Payout amount */
    amount: string;
    /** Server signature */
    signature: string;
    /** Nonce for replay protection */
    nonce: string;
    /** Deadline for claim expiration */
    deadline: string;
}

export interface GameStoreState {
    /** Application state */
    appState: 'lobby' | 'game';

    /** Game configuration */
    config: GameConfig | null;

    /** Current game state */
    state: GameState | null;

    /** Rolling animation state */
    isRolling: boolean;

    /** Moving animation state */
    isMoving: boolean;

    /** Currently animating token (to prevent teleportation from server updates) */
    activeMovingToken: { playerIdx: number; tokenIdx: number; isBonus: boolean } | null;

    /** Board rotation (for web3 local player) */
    boardRotation: number;

    /** Turn timer (seconds remaining) */
    turnTimer: number | null;

    /** Server message */
    serverMsg: string | null;

    /** Socket.io instance */
    socket: Socket | null;

    /** Local player index in multiplayer */
    myPlayerIndex: number | null;

    /** Payout proof for Web3 claims */
    payoutProof: PayoutProof | null;
    /** User selected color from lobby */
    mySelectedColor: PlayerColor | null;

    /** Screen shake state */
    isShaking: boolean;

    /** Sound mute state */
    isMuted: boolean;

    /** Countdown states */
    showCountdown: boolean;
    gameCountdown: number;

    /** Actions */
    setAppState: (appState: 'lobby' | 'game') => void;
    setConfig: (config: GameConfig | null) => void;
    setGameState: (stateOrFn: GameState | null | ((prev: GameState | null) => GameState | null)) => void;
    updateState: (partial: Partial<GameState>) => void;
    setIsRolling: (isRolling: boolean) => void;
    setIsMoving: (isMoving: boolean) => void;
    setActiveMovingToken: (activeMovingToken: { playerIdx: number; tokenIdx: number; isBonus: boolean } | null) => void;
    setBoardRotation: (rotation: number) => void;
    setTurnTimer: (seconds: number | null) => void;
    setServerMsg: (msg: string | null) => void;
    initGame: (config: GameConfig) => void;
    setSocket: (socket: Socket | null) => void;
    setMyPlayerIndex: (index: number | null) => void;
    setPayoutProof: (proof: PayoutProof | null) => void;
    setMySelectedColor: (color: PlayerColor | null) => void;
    setIsShaking: (isShaking: boolean) => void;
    setIsMuted: (isMuted: boolean) => void;
    setShowCountdown: (show: boolean) => void;
    setGameCountdown: (countdown: number) => void;
    reset: () => void;
}

