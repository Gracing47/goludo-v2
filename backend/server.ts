import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import { signPayout, walletAddress } from './signer.js';
import path from 'path';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

// Engine Imports
// Fix: Import from .ts source files directly (ts-node will handle this) or compiled .js if building
// Since we are likely running via ts-node or similar in dev, we should point to the .ts files or their transpiled outputs.
// However, standard ESM in Node requires extensions.
// If using ts-node/tsx, we can import from .ts
// Let's assume the environment supports TS or standard JS resolution.
import { createInitialState, rollDice, moveToken, completeMoveAnimation } from '../src/engine/gameLogic';
import { GAME_PHASE } from '../src/engine/constants';

// Room Lifecycle Manager (prevents memory leaks at scale)
import { registerRoomTimer, clearAllRoomTimers, cleanupRoom, startCleanupJob, clearSpecificTimer } from './roomManager.js';

// Blockchain Verification (Phase 5: On-Chain Security)
import { verifyRoomCreation, verifyRoomJoin, recoverActiveRoomsFromBlockchain, getRoomStateFromContract } from './contractVerifier.js';

// Input Validation (Phase 6: Audit Readiness)
import { validateRequest, createRoomSchema, payoutSignSchema } from './validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.set('trust proxy', 1); // Phase 6: Required for express-rate-limit behind Railway/Netlify proxy

// ============================================
// SECURITY HEADERS (Phase 7: Final Hardening)
// ============================================
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for WebSocket/API compatibility
    crossOriginEmbedderPolicy: false
}));
const server = http.createServer(app);
// Production-aware CORS origins
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
    ? ["https://goludo.netlify.app", "https://goludo-production.up.railway.app"]
    : ["http://localhost:3000", "http://localhost:5173", "https://goludo.netlify.app", "https://goludo-production.up.railway.app"];

const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true
    }
});
const PORT = process.env.PORT || 3333;

let activeRooms: any[] = [];

app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true
}));
app.use(bodyParser.json({ limit: '10kb' })); // Phase 7: Prevent DoS via large payloads

// ============================================
// RATE LIMITING (Phase 6: Audit Readiness)
// ============================================

// Rate limiters for different endpoint types
const payoutLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute per IP
    message: { error: 'Too many payout requests. Please wait.' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
        console.log(`🚫 Rate limit exceeded: ${req.ip} on ${req.path}`);
        res.status(429).json(options.message);
    }
});

const createRoomLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5, // 5 room creations per minute per IP
    message: { error: 'Too many room creation requests. Please wait.' },
    standardHeaders: true,
    legacyHeaders: false
});

const joinRoomLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10, // 10 join attempts per minute per IP
    message: { error: 'Too many join requests. Please wait.' },
    standardHeaders: true,
    legacyHeaders: false
});

// ============================================
// HEALTH CHECK (Phase 8: Monitoring)
// ============================================
app.get('/health', (_req: express.Request, res: express.Response) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        rooms: activeRooms.length,
        version: '1.0.0'
    });
});

// Basic request logger for production monitoring
app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (req.url === '/health' || req.url === '/metrics') return next();
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const COLOR_MAP = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };

const broadcastState = (room: any, message: string | null = null) => {
    // Extract player skip metadata for the frontend
    const playersMetadata = room.players.map((p: any) => p ? {
        skipCount: p.skipCount || 0,
        forfeited: p.forfeited || false
    } : null);

    io.to(room.id).emit('state_update', {
        ...room.gameState,
        currentTurn: room.gameState.activePlayer,
        turnState: room.gameState.gamePhase === GAME_PHASE.ROLL_DICE ? "WAITING_FOR_ROLL" : "WAITING_FOR_MOVE",
        lastDice: room.gameState.diceValue,
        msg: message || room.gameState.message,
        playersMetadata // Added to sync skips and forfeit status
    });
};

// ============================================
// AAA-LEVEL TURN TIMER SYSTEM
// ============================================
const TURN_TIMEOUT_MS = 10000; // 10 seconds
const FORFEIT_TIMEOUT_MS = 15000; // 15 seconds for recovery before skip counts
const COUNTDOWN_INTERVAL_MS = 1000; // Update every second
const MAX_SKIPS_BEFORE_FORFEIT = 3; // Player forfeits after 3 skips (AFK or disconnect)

// Store both timeout and interval for each room
const activeTurnTimers = new Map<string, any>(); // roomId -> { timeoutId, intervalId, startTime, phase }

/**
 * Handles a player skip (from AFK timeout or disconnect timeout)
 * After 3 skips, player forfeits
 * @returns {boolean} true if player forfeited, false if still in game
 */
function handlePlayerSkip(io: Server, room: any, playerIndex: number, reason = 'timeout') {
    const player = room.players[playerIndex];
    if (!player || player.forfeited) return true;

    // Initialize skip counter if not exists
    if (typeof player.skipCount !== 'number') {
        player.skipCount = 0;
    }

    player.skipCount++;
    console.log(`⏭️ Player ${player.name} skipped (${reason}). Skip count: ${player.skipCount}/${MAX_SKIPS_BEFORE_FORFEIT}`);
    console.log(`📝 Blockchain Event: PLAYER_SKIPPED | Room: ${room.id} | Player: ${player.address} | SkipCount: ${player.skipCount} | Reason: ${reason}`);

    // Check if player should forfeit
    if (player.skipCount >= MAX_SKIPS_BEFORE_FORFEIT) {
        console.log(`💀 Player ${player.name} forfeited after ${MAX_SKIPS_BEFORE_FORFEIT} skips!`);
        player.forfeited = true;

        // Track forfeit event
        const winnerIdx = room.gameState.activeColors.find((idx: number) => idx !== playerIndex);
        const winner = room.players[winnerIdx];
        console.log(`📝 Blockchain Event: PLAYER_FORFEIT | Room: ${room.id} | Forfeiter: ${player.address} | Winner: ${winner?.address} | Reason: ${MAX_SKIPS_BEFORE_FORFEIT}_skips`);

        // Remove from active colors
        room.gameState.activeColors = room.gameState.activeColors.filter((idx: number) => idx !== playerIndex);
        broadcastState(room, `💀 ${player.name} forfeited (${MAX_SKIPS_BEFORE_FORFEIT} skips).`);

        // Check win condition
        if (room.gameState.activeColors.length === 1) {
            declareWinner(io, room, room.gameState.activeColors[0]);
            return true;
        } else if (room.gameState.activeColors.length === 0) {
            cleanupRoom(room.id, activeRooms);
            return true;
        }

        return true; // Player forfeited
    }

    // Broadcast skip to all players
    io.to(room.id).emit('player_skipped', {
        playerIndex,
        playerName: player.name,
        skipCount: player.skipCount,
        maxSkips: MAX_SKIPS_BEFORE_FORFEIT,
        reason
    });

    return false; // Player still in game
}

/**
 * Clears all timers for a room (timeout + countdown interval)
 */
function clearRoomTimers(roomId: string) {
    const id = roomId?.toLowerCase();
    const timerData = activeTurnTimers.get(id);
    if (timerData) {
        if (timerData.timeoutId) clearTimeout(timerData.timeoutId);
        if (timerData.intervalId) clearInterval(timerData.intervalId);
        activeTurnTimers.delete(id);
        console.log(`⏹️ Cleared timers for room ${id}`);
    }
}

/**
 * Starts a countdown timer with live updates
 */
function startTurnTimer(io: Server, room: any, playerIndex: number, phase: any) {
    const roomId = room.id.toLowerCase();
    const currentPlayer = room.players[playerIndex];

    // Clear any existing timers first
    clearRoomTimers(roomId);

    console.log(`⏰ Starting ${TURN_TIMEOUT_MS / 1000}s timer for ${currentPlayer?.name || 'Unknown'} (Phase: ${phase})`);

    // Broadcast initial timer start with expiration timestamp
    io.to(room.id).emit('turn_timer_start', {
        playerIndex,
        expiresAt: Date.now() + TURN_TIMEOUT_MS,
        phase
    });

    // We still keep the timeout for server-side enforcement,
    // but we can remove the 1s interval emit to save bandwidth
    const timeoutId = setTimeout(() => {
        console.log(`⏰ TIMEOUT! Player ${currentPlayer.name} didn't act in ${TURN_TIMEOUT_MS / 1000}s. Skipping turn...`);
        // The timer is cleared by clearRoomTimers when the next turn starts or game ends.
        // For this specific timeout, we just need to handle the game logic.
        // activeTurnTimers.delete(room.id) is handled by clearRoomTimers or when a new timer is set.

        // Broadcast timeout event
        io.to(room.id).emit('turn_timeout', {
            playerIndex,
            playerName: currentPlayer.name,
            phase
        });

        // Handle timeout based on game phase
        handleTurnTimeout(io, room, playerIndex, phase);
    }, TURN_TIMEOUT_MS);

    // Store timeout ID for cleanup
    activeTurnTimers.set(roomId, {
        timeoutId,
        phase,
        playerIndex
    });
}

/**
 * Handles what happens when a turn times out (AFK - still connected but not acting)
 */
function handleTurnTimeout(io: Server, room: any, playerIndex: number, phase: any) {
    const currentPlayer = room.players[playerIndex];

    // Use unified skip system - counts towards 3-skip forfeit
    const playerForfeited = handlePlayerSkip(io, room, playerIndex, 'afk_timeout');

    if (playerForfeited) {
        // Player was removed from game, handlePlayerSkip already handled everything
        return;
    }

    // Player still in game, proceed to next turn
    if (phase === GAME_PHASE.ROLL_DICE) {
        const nextPlayerIdx = getNextPlayer(playerIndex, room.gameState.activeColors);
        room.gameState.activePlayer = nextPlayerIdx;
        room.gameState.consecutiveSixes = 0;

        broadcastState(room, `⏰ ${currentPlayer?.name || 'Player'} timed out. Turn skipped (${currentPlayer?.skipCount}/${MAX_SKIPS_BEFORE_FORFEIT}).`);
        handleNextTurn(io, room);
    } else if (phase === GAME_PHASE.SELECT_TOKEN || phase === GAME_PHASE.BONUS_MOVE) {
        const nextPlayerIdx = getNextPlayer(playerIndex, room.gameState.activeColors);
        room.gameState.activePlayer = nextPlayerIdx;
        room.gameState.gamePhase = GAME_PHASE.ROLL_DICE;
        room.gameState.validMoves = [];
        room.gameState.diceValue = null;
        room.gameState.consecutiveSixes = 0;
        room.gameState.bonusMoves = 0;

        broadcastState(room, `⏰ ${currentPlayer.name} timed out. Move forfeited (${currentPlayer?.skipCount}/${MAX_SKIPS_BEFORE_FORFEIT}).`);
        handleNextTurn(io, room);
    }
}

/**
 * Main turn handler - manages turn flow and timer initialization
 */
function handleNextTurn(io: Server, room: any) {
    if (room.gameState?.gamePhase === 'WIN') return;

    const currentPlayerIndex = room.gameState.activePlayer;
    const currentPlayer = room.players[currentPlayerIndex];

    if (!currentPlayer) {
        console.error(`🚨 Fatal: currentPlayer is null at index ${currentPlayerIndex}`);
        return;
    }

    const colorName = currentPlayer.color || 'unknown';
    console.log(`🔄 Turn switched to Player ${currentPlayerIndex} (${colorName})`);

    // Check if player is connected
    if (currentPlayer.socketId) {
        console.log(`👤 Waiting for Human Player ${currentPlayer.name} (Socket ${currentPlayer.socketId})`);
        // Start normal turn timer
        startTurnTimer(io, room, currentPlayerIndex, room.gameState.gamePhase);
    } else {
        // Player is disconnected - they might already have a forfeit timer running from the 'disconnect' event
        console.log(`⚠️ Player ${currentPlayerIndex} (${currentPlayer.name}) is disconnected. Waiting for forfeit watchdog...`);
        broadcastState(room, `⚠️ ${currentPlayer.name} is offline. Turn paused for recovery.`);
    }
}

/**
 * Global Win Handler - Centralized logic for ending a game
 */
function declareWinner(io: Server, room: any, winnerIdx: number) {
    const winner = room.players[winnerIdx];
    const winnerName = winner?.name || `Player ${winnerIdx + 1}`;

    console.log(`🏆 Winner Declared: ${winnerName} in room ${room.id}`);

    // 📊 LEADERBOARD: Track game duration
    const gameDurationMs = room._gameStartedAt ? Date.now() - room._gameStartedAt : 0;
    const gameDurationSec = Math.floor(gameDurationMs / 1000);
    console.log(`📝 Blockchain Event: GAME_DURATION | Room: ${room.id} | Duration: ${gameDurationSec}s | Winner: ${winner?.address}`);

    room.gameState.gamePhase = 'WIN';
    room.gameState.winner = winnerIdx;
    broadcastState(room, `🎉 ${winnerName} Wins!`);

    // Cleanup logic
    clearRoomTimers(room.id);
    clearAllRoomTimers(room.id);

    // Schedule room removal
    setTimeout(() => {
        cleanupRoom(room.id, activeRooms);
    }, 5 * 60 * 1000); // 5 minutes for players to view results
}

// Helper function to get next player
function getNextPlayer(current: number, activeColors: number[]) {
    if (!activeColors || activeColors.length === 0) return 0;
    const currentIndex = activeColors.indexOf(current);
    if (currentIndex === -1) return activeColors[0];
    const nextIndex = (currentIndex + 1) % activeColors.length;
    return activeColors[nextIndex];
}

/**
 * Handles the pre-game countdown and transitions the room to ACTIVE
 */
function startGameCountdown(io: Server, room: any, roomId: string) {
    // Prevent double starts
    if (room._countdownStarted) return;
    room._countdownStarted = true;

    let countdown = 5;

    // Emit initial countdown
    io.to(roomId).emit('pre_game_countdown', {
        room: room,
        countdownSeconds: countdown,
        message: "Get Ready!"
    });

    // Store current countdown value on room object for late joiners
    room._currentCountdown = countdown;

    const countdownInterval = setInterval(() => {
        countdown--;
        room._currentCountdown = countdown;

        const connectedNow = room.players.filter((p: any) => p && p.socketId).length;
        const totalPlayersNeeded = room.players.filter((p: any) => p).length;
        console.log(`⏳ Countdown: ${countdown}s | Sockets: ${connectedNow}/${totalPlayersNeeded}`);

        io.to(room.id).emit('countdown_tick', {
            remaining: countdown,
            connectedPlayers: connectedNow,
            totalPlayers: totalPlayersNeeded
        });

        if (countdown <= 0) {
            clearInterval(countdownInterval);

            // STEP 3: Ensure game state is initialized (should be done already when status became STARTING)
            if (!room.gameState) {
                const activeColors = room.players
                    .map((p: any, idx: number) => p ? idx : null)
                    .filter((idx: any) => idx !== null) as number[];
                room.gameState = createInitialState(4, activeColors);
            }

            room.status = "ACTIVE";
            room._gameStartedAt = Date.now(); // For duration tracking

            console.log(`🎮 Game Starting: Room ${roomId}`);
            console.log(`📋 Active colors: [${room.gameState.activeColors.join(', ')}]`);
            console.log(`📋 Socket states:`, room.players.filter((p: any) => p).map((p: any) => `${p.name}: ${p.socketId ? '✅' : '❌'}`));
            console.log(`📝 Blockchain Event: GAME_STARTED | Room: ${roomId} | Players: ${room.players.filter((p: any) => p).map((p: any) => p.address).join(', ')}`);

            io.to(roomId).emit('game_started', room);
            broadcastState(room, "Game Started!");

            // STEP 4: Begin turn logic
            setTimeout(() => {
                handleNextTurn(io, room);
            }, 1000);
        }
    }, 1000);

    // Register interval for cleanup
    registerRoomTimer(roomId, 'countdownInterval', countdownInterval);
}


io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    socket.on('join_match', (data) => {
        console.log(`📥 join_match event received:`, JSON.stringify(data));

        // Support both old string format and new object format
        const roomId = ((typeof data === 'object') ? data.roomId : data)?.toLowerCase();
        const playerAddress = (typeof data === 'object') ? data.playerAddress : null;

        socket.join(roomId);

        // Map Socket ID to Player
        const room = activeRooms.find(r => r.id?.toLowerCase() === roomId);
        if (room && playerAddress) {
            const playerIndex = room.players.findIndex((p: any) => p && p.address?.toLowerCase() === playerAddress.toLowerCase());
            const player = room.players[playerIndex];

            if (player) {
                player.socketId = socket.id;
                console.log(`🔗 Linked Socket ${socket.id} to Player ${player.name} (${player.color})`);

                // ✅ Clear individual forfeit watchdog
                clearSpecificTimer(roomId, `forfeit_${playerIndex}`);

                // CRITICAL FIX: Only send full state sync if game is ACTIVE (not during countdown)
                if (room.gameState && room.status === "ACTIVE") {
                    console.log(`🔄 Sending immediate state sync to ${player.name}`);
                    // Re-emit game_started so the client enters the 'game' AppState if they were in lobby
                    socket.emit('game_started', room);

                    // Send current board state
                    socket.emit('state_update', {
                        ...room.gameState,
                        currentTurn: room.gameState.activePlayer,
                        turnState: room.gameState.gamePhase === GAME_PHASE.ROLL_DICE ? "WAITING_FOR_ROLL" : "WAITING_FOR_MOVE",
                        lastDice: room.gameState.diceValue,
                        msg: room.gameState.message || "Reconnected"
                    });

                    // ⚡ If it's their turn and they were disconnected, RESUME it
                    if (room.gameState.activePlayer === playerIndex) {
                        console.log(`🏃 Resuming turn for reconnected player ${player.name}`);
                        handleNextTurn(io, room);
                    }
                } else if (room.status === "STARTING") {
                    // During countdown, send the current countdown value and initialization event
                    console.log(`⏳ Player ${player.name} connected during countdown (${room._currentCountdown || 5}s) - syncing state`);

                    socket.emit('pre_game_countdown', {
                        room: room,
                        countdownSeconds: room._currentCountdown || 5,
                        message: "Synchronizing..."
                    });

                    // Also send gameState if it exists (highly likely since we init it on STARTING now)
                    if (room.gameState) {
                        socket.emit('state_update', {
                            ...room.gameState,
                            currentTurn: room.gameState.activePlayer,
                            turnState: "WAITING_FOR_GAME_START",
                            msg: "Game starting soon..."
                        });
                    }
                }
            }
        }
    });

    socket.on('roll_dice', ({ roomId, playerAddress }) => {
        try {
            const normalizedId = roomId?.toLowerCase();
            const room = activeRooms.find(r => r.id?.toLowerCase() === normalizedId);
            if (!room || !room.gameState) return;

            // CRITICAL: Block rolling during countdown phase
            if (room.status === "STARTING") {
                console.log(`⏳ Roll blocked - game still in countdown phase`);
                socket.emit('game_error', { message: 'Wait for countdown to finish!' });
                return;
            }

            const activePlayerIdx = room.gameState.activePlayer;
            const activePlayerObj = room.players[activePlayerIdx];

            if (activePlayerObj?.address?.toLowerCase() !== playerAddress?.toLowerCase()) {
                console.log(`❌ Out-of-turn roll attempt by ${playerAddress} (Expected: Player ${activePlayerIdx} - ${activePlayerObj?.address})`);
                return;
            }

            if (room.gameState.gamePhase !== GAME_PHASE.ROLL_DICE) return;

            // Clear turn timer - player acted in time
            clearRoomTimers(room.id);

            const newState = rollDice(room.gameState);
            const rolledValue = newState.diceValue;
            const isPenalty = newState.message && newState.message.includes('Triple 6');

            room.gameState = newState;

            console.log(`🎲 Player ${activePlayerIdx} rolled ${rolledValue || 'Penalty'}`);

            // Emit the roll (use 6 if penalty, so dice actually rolls)
            io.to(roomId).emit('dice_rolled', {
                value: isPenalty ? 6 : rolledValue,
                playerIndex: activePlayerIdx
            });

            broadcastState(room);

            // If penalty or no valid moves, auto-skip after brief delay
            if (isPenalty || room.gameState.validMoves.length === 0) {
                const delay = isPenalty ? 2500 : 1500;
                setTimeout(() => handleNextTurn(io, room), delay);
            } else {
                // Player has valid moves - start timer for token selection
                startTurnTimer(io, room, activePlayerIdx, room.gameState.gamePhase);
            }
        } catch (error) {
            console.error('🚨 Error in roll_dice handler:', error);
            socket.emit('game_error', { message: 'Server error during dice roll. Please try again.' });
        }
    });

    socket.on('move_token', ({ roomId, playerAddress, tokenIndex }) => {
        try {
            const normalizedId = roomId?.toLowerCase();
            const room = activeRooms.find(r => r.id?.toLowerCase() === normalizedId);
            if (!room || !room.gameState) return;

            const activePlayerIdx = room.gameState.activePlayer;
            const activePlayerObj = room.players[activePlayerIdx];

            if (activePlayerObj?.address?.toLowerCase() !== playerAddress?.toLowerCase()) {
                console.log(`❌ Out-of-turn move by ${playerAddress}`);
                return;
            }

            const validMove = room.gameState.validMoves.find((m: any) => m.tokenIndex === tokenIndex);
            if (!validMove) {
                console.log(`❌ Invalid move attempt for token ${tokenIndex}`);
                return;
            }

            // Clear turn timer - player acted in time
            clearRoomTimers(room.id);

            console.log(`➡️ Player ${activePlayerIdx} moved token ${tokenIndex}`);

            let newState = moveToken(room.gameState, validMove);
            newState = completeMoveAnimation(newState);

            // 📊 LEADERBOARD: Track captures
            if (validMove.captures && validMove.captures.length > 0) {
                const attacker = room.players[activePlayerIdx];
                validMove.captures.forEach((capture: any) => {
                    const victim = room.players[capture.player];
                    console.log(`📝 Blockchain Event: TOKEN_CAPTURED | Room: ${room.id} | Attacker: ${attacker?.address} | Victim: ${victim?.address}`);
                });

                // Track first blood (first capture in the game)
                if (!room._firstBloodLogged) {
                    room._firstBloodLogged = true;
                    console.log(`📝 Blockchain Event: FIRST_BLOOD | Room: ${room.id} | Player: ${attacker?.address}`);
                }
            }

            room.gameState = newState;

            let msg = null;
            if (newState.gamePhase === 'WIN') {
                declareWinner(io, room, newState.winner!);
                return;
            } else if (newState.gamePhase === GAME_PHASE.BONUS_MOVE) {
                msg = "Bonus Turn! Move again.";
            } else if (newState.diceValue === 6 && newState.gamePhase === GAME_PHASE.ROLL_DICE) {
                msg = "Six! Roll again.";
            }

            broadcastState(room, msg);

            // TRIGGER NEXT TURN OR BONUS MOVE
            if (newState.gamePhase === GAME_PHASE.BONUS_MOVE) {
                // Bonus move - same player, start timer for token selection
                console.log(`🎁 Bonus move activated for Player ${activePlayerIdx}`);
                startTurnTimer(io, room, activePlayerIdx, GAME_PHASE.BONUS_MOVE);
            } else if (newState.gamePhase === GAME_PHASE.ROLL_DICE) {
                // Normal turn end or roll-again after 6
                handleNextTurn(io, room);
            }
        } catch (error) {
            console.error('🚨 Error in move_token handler:', error);
            socket.emit('game_error', { message: 'Server error during token move. Please try again.' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
        activeRooms.forEach(room => {
            const pIdx = room.players.findIndex((p: any) => p && p.socketId === socket.id);
            if (pIdx !== -1) {
                const player = room.players[pIdx];
                player.socketId = null;
                console.log(`⚠️ Player ${player.name} (${player.color}) disconnected from room ${room.id}`);

                // If game is active, start a 15s reconnect window - after which it counts as 1 skip
                if (room.status === 'ACTIVE' && room.gameState && !player.forfeited) {
                    console.log(`🛡️ Starting ${FORFEIT_TIMEOUT_MS / 1000}s reconnect window for ${player.name}`);

                    const skipTimer = setTimeout(() => {
                        const roomRef = activeRooms.find(r => r.id === room.id);
                        const playerRef = roomRef?.players[pIdx];

                        // Only count skip if player is still disconnected
                        if (playerRef && !playerRef.socketId && !playerRef.forfeited) {
                            console.log(`⏱️ Player ${playerRef.name} didn't reconnect in ${FORFEIT_TIMEOUT_MS / 1000}s - counting as skip`);

                            // Use unified skip system
                            const playerForfeited = handlePlayerSkip(io, roomRef, pIdx, 'disconnect');

                            if (!playerForfeited && roomRef.gameState.activePlayer === pIdx) {
                                // Player still in game but it was their turn - skip to next
                                console.log(`⏭️ Disconnected player's turn - skipping to next`);
                                const nextIdx = getNextPlayer(pIdx, roomRef.gameState.activeColors);
                                roomRef.gameState.activePlayer = nextIdx;
                                roomRef.gameState.gamePhase = GAME_PHASE.ROLL_DICE;
                                roomRef.gameState.diceValue = null;
                                roomRef.gameState.validMoves = [];

                                broadcastState(roomRef);
                                handleNextTurn(io, roomRef);
                            }
                        }
                    }, FORFEIT_TIMEOUT_MS);

                    registerRoomTimer(room.id, `skip_${pIdx}`, skipTimer);
                }
            }
        });
    });
});

// ============================================
// PRODUCTION MONITORING ENDPOINTS
// ============================================

app.get('/', (_req: express.Request, res: express.Response) => res.json({
    message: "GoLudo Backend v4 (Production Ready)",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
}) as any);

/**
 * Health Check Endpoint
 * Used by Railway/Docker for container health monitoring
 */
app.get('/health', (_req: express.Request, res: express.Response) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        activeRooms: activeRooms.length,
        memory: {
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
        },
        timestamp: new Date().toISOString()
    });
});

/**
 * Metrics Endpoint
 * Detailed stats for monitoring dashboards (Grafana, DataDog, etc.)
 */
app.get('/metrics', (_req: express.Request, res: express.Response) => {
    // Import roomTimers dynamically to avoid circular deps
    const { roomTimers } = require('./roomManager.js');

    res.json({
        server: {
            uptime: process.uptime(),
            env: process.env.NODE_ENV || 'development',
            memory: process.memoryUsage()
        },
        rooms: {
            total: activeRooms.length,
            waiting: activeRooms.filter(r => r.status === 'WAITING').length,
            starting: activeRooms.filter(r => r.status === 'STARTING').length,
            active: activeRooms.filter(r => r.status === 'ACTIVE').length,
            finished: activeRooms.filter(r => r.gameState?.gamePhase === 'WIN').length,
            cancelled: activeRooms.filter(r => r.status === 'CANCELLED').length
        },
        timers: {
            turn: activeTurnTimers.size,
            lifecycle: roomTimers.size
        },
        sockets: {
            connected: io.sockets.sockets.size
        },
        timestamp: new Date().toISOString()
    });
});

app.post('/api/payout/sign', payoutLimiter, validateRequest(payoutSignSchema), async (req, res) => {
    const { roomId, winner } = req.body;
    const normalizedId = roomId?.toLowerCase();

    // CRITICAL SECURITY CHECK
    const room = activeRooms.find(r => r.id?.toLowerCase() === normalizedId);

    if (!room) {
        // @ts-ignore
        return res.status(404).json({ error: "Room not found on server" });
    }

    if (!room.gameState || room.gameState.gamePhase !== 'WIN') {
        // @ts-ignore
        return res.status(400).json({ error: "Game is not finished yet" });
    }

    const winnerIdx = room.gameState.winner;
    const actualWinner = room.players[winnerIdx];

    if (!actualWinner || actualWinner.address?.toLowerCase() !== winner?.toLowerCase()) {
        console.warn(`🚨 Unauthorized payout signature attempt for room ${roomId}. Requested: ${winner}, Actual: ${actualWinner?.address}`);
        // @ts-ignore
        return res.status(403).json({ error: "Unauthorized winner" });
    }

    try {
        // 🔗 PHASE 5: Fetch pot amount directly from blockchain (trustless)
        const contractRoom = await getRoomStateFromContract(roomId) as { pot: string; status: number };
        const potAmount = contractRoom.pot;

        const payoutProof = await signPayout(roomId, winner, potAmount);
        res.json(payoutProof);
    } catch (e: any) {
        console.error("❌ Sign Payout Error:", e);
        // @ts-ignore
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/rooms', (req, res) => res.json(activeRooms));

app.post('/api/rooms/create', createRoomLimiter, validateRequest(createRoomSchema), async (req, res) => {
    let { roomId, txHash, stake, maxPlayers, creatorName, creatorAddress } = req.body;
    roomId = roomId?.toLowerCase();

    // ✅ PHASE 5: Verify transaction on blockchain
    if (txHash) {
        try {
            await verifyRoomCreation(roomId, txHash, creatorAddress, stake);
            console.log(`✅ Room creation verified on-chain: ${roomId}`);
        } catch (error: any) {
            console.warn(`🚨 Room creation verification failed: ${error.message}`);
            // @ts-ignore
            return res.status(403).json({
                error: "Transaction verification failed",
                details: error.message
            });
        }
    } else {
        console.warn(`⚠️ Room creation without txHash (legacy mode): ${roomId}`);
    }

    // @ts-ignore
    if (activeRooms.find(r => r.id?.toLowerCase() === roomId)) return res.status(400).json({ error: "Room exists" });

    const colorMap: any = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };
    const creatorColorIndex = colorMap[req.body.color?.toLowerCase() || 'red'];

    const newRoom = {
        id: roomId,
        stake,
        maxPlayers: parseInt(maxPlayers),
        // Initialize with 4 empty slots to match board colors (0-Red, 1-Green, 2-Yellow, 3-Blue)
        players: [null, null, null, null] as any[],
        gameState: null,
        status: "WAITING",
        createdAt: Date.now() // Track creation time for cleanup
    };

    // Place creator in their chosen color slot
    newRoom.players[creatorColorIndex] = {
        name: creatorName,
        address: creatorAddress,
        color: req.body.color?.toLowerCase() || 'red', // Store color name for reference
        socketId: null,
        joinedAt: Date.now(),
        forfeited: false, // Track individual status
        skipCount: 0
    };

    activeRooms.push(newRoom);

    // Register 1-hour cleanup timer
    registerRoomTimer(roomId, 'cleanup', setTimeout(() => {
        cleanupRoom(roomId, activeRooms);
    }, 60 * 60 * 1000));

    console.log(`🏠 Room created: ${roomId} by ${creatorName} (${creatorAddress})`);
    res.json({ success: true, roomId });
});

app.post('/api/rooms/join', joinRoomLimiter, async (req, res) => {
    let { roomId, txHash, playerName, playerAddress, color } = req.body;
    roomId = roomId?.toLowerCase();

    const room = activeRooms.find(r => r.id === roomId);
    if (!room) {
        // @ts-ignore
        return res.status(404).json({ error: "Room not found" });
    }

    if (room.status !== "WAITING") {
        // @ts-ignore
        return res.status(400).json({ error: "Game already started" });
    }

    // Check if player is already in room (idempotency)
    const existingPlayer = room.players.find((p: any) => p && p.address.toLowerCase() === playerAddress.toLowerCase());
    if (existingPlayer) {
        // @ts-ignore
        return res.json({ success: true, message: "Already joined" });
    }

    const currentPlayers = room.players.filter((p: any) => p).length;
    if (currentPlayers >= room.maxPlayers) {
        // @ts-ignore
        return res.status(400).json({ error: "Room full" });
    }

    const colorMap: any = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };
    const requestedColorIndex = colorMap[color?.toLowerCase()];

    // Validate color slot
    if (room.players[requestedColorIndex] !== null) {
        // @ts-ignore
        return res.status(400).json({ error: "Color already taken" });
    }

    // ✅ PHASE 5: Verify join transaction on blockchain
    if (txHash) {
        try {
            await verifyRoomJoin(roomId, txHash, playerAddress, room.stake);
            console.log(`✅ Room join verified on-chain: ${playerAddress} -> ${roomId}`);
        } catch (error: any) {
            console.warn(`🚨 Room join verification failed: ${error.message}`);
            // @ts-ignore
            return res.status(403).json({
                error: "Transaction verification failed",
                details: error.message
            });
        }
    } else {
        console.warn(`⚠️ Room join without txHash (legacy mode): ${playerAddress}`);
    }

    // Add player to specific slot
    room.players[requestedColorIndex] = {
        name: playerName,
        address: playerAddress,
        color: color?.toLowerCase(),
        socketId: null,
        joinedAt: Date.now(),
        forfeited: false,
        skipCount: 0
    };

    console.log(`👋 ${playerName} joined Room ${roomId} as ${color}`);

    // Check if room needs to start
    const totalPlayers = room.players.filter((p: any) => p).length;
    if (totalPlayers >= room.maxPlayers) {
        room.status = "STARTING";
        console.log(`🚦 Room ${roomId} is full (${totalPlayers}/${room.maxPlayers})! Status -> STARTING`);

        // Initialize Game State immediately so joiners see the board under the countdown
        const activeColors = room.players
            .map((p: any, idx: number) => p ? idx : null)
            .filter((idx: any) => idx !== null) as number[];
        room.gameState = createInitialState(4, activeColors);

        // Notify all clients to start countdown
        io.to(roomId).emit('room_full', room);

        // Initiate start sequence
        startGameCountdown(io, room, roomId);
    }

    res.json({ success: true, room });
});

// Start cleanup job (runs every 10 mins)
startCleanupJob(activeRooms);

// Start server
server.listen(PORT, async () => {
    console.log(`🚀 Game Server running on port ${PORT}`);

    // Try to recover state on startup (Crash recovery)
    try {
        const recovered = await recoverActiveRoomsFromBlockchain();
        if (recovered && recovered.length > 0) {
            console.log(`♻️ Recovered ${recovered.length} active rooms from blockchain state`);
            recovered.forEach((r: any) => {
                if (!activeRooms.find(ar => ar.id === r.id)) {
                    activeRooms.push(r);
                }
            });
        }
    } catch (e) {
        console.warn(`⚠️ State recovery skipped:`, e);
    }
});
