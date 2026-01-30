import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { signPayout, walletAddress } from './signer.js';
import path from 'path';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

// Engine Imports
import { createInitialState, rollDice, moveToken, completeMoveAnimation } from '../src/engine/gameLogic.js';
import { GAME_PHASE } from '../src/engine/constants.js';

// Room Lifecycle Manager (prevents memory leaks at scale)
import { registerRoomTimer, clearAllRoomTimers, cleanupRoom, startCleanupJob, clearSpecificTimer } from './roomManager.js';

// Blockchain Verification (Phase 5: On-Chain Security)
import { verifyRoomCreation, verifyRoomJoin, recoverActiveRoomsFromBlockchain, getRoomStateFromContract } from './contractVerifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:3000",
            "http://localhost:5173",
            "https://goludo.netlify.app",
            "https://goludo-production.up.railway.app"
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});
const PORT = process.env.PORT || 3333;

let activeRooms = [];

app.use(cors({
    origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://goludo.netlify.app",
        "https://goludo-production.up.railway.app"
    ],
    credentials: true
}));
app.use(bodyParser.json());

// Basic request logger for production monitoring
app.use((req, res, next) => {
    if (req.url === '/health' || req.url === '/metrics') return next();
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const COLOR_MAP = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };

const broadcastState = (room, message = null) => {
    io.to(room.id).emit('state_update', {
        ...room.gameState,
        currentTurn: room.gameState.activePlayer,
        turnState: room.gameState.gamePhase === GAME_PHASE.ROLL_DICE ? "WAITING_FOR_ROLL" : "WAITING_FOR_MOVE",
        lastDice: room.gameState.diceValue,
        msg: message || room.gameState.message
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
const activeTurnTimers = new Map(); // roomId -> { timeoutId, intervalId, startTime, phase }

/**
 * Handles a player skip (from AFK timeout or disconnect timeout)
 * After 3 skips, player forfeits
 * @returns {boolean} true if player forfeited, false if still in game
 */
function handlePlayerSkip(io, room, playerIndex, reason = 'timeout') {
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
        const winnerIdx = room.gameState.activeColors.find(idx => idx !== playerIndex);
        const winner = room.players[winnerIdx];
        console.log(`📝 Blockchain Event: PLAYER_FORFEIT | Room: ${room.id} | Forfeiter: ${player.address} | Winner: ${winner?.address} | Reason: ${MAX_SKIPS_BEFORE_FORFEIT}_skips`);

        // Remove from active colors
        room.gameState.activeColors = room.gameState.activeColors.filter(idx => idx !== playerIndex);
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
function clearRoomTimers(roomId) {
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
function startTurnTimer(io, room, playerIndex, phase) {
    const roomId = room.id.toLowerCase();
    const currentPlayer = room.players[playerIndex];

    // Clear any existing timers first
    clearRoomTimers(roomId);

    const startTime = Date.now();
    let remainingSeconds = Math.floor(TURN_TIMEOUT_MS / 1000);

    console.log(`⏰ Starting ${remainingSeconds}s timer for ${currentPlayer?.name || 'Unknown'} (Phase: ${phase})`);

    // Broadcast initial timer start
    io.to(room.id).emit('turn_timer_start', {
        playerIndex,
        timeoutMs: TURN_TIMEOUT_MS,
        phase
    });

    // Countdown interval - updates every second
    const intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime;
        remainingSeconds = Math.max(0, Math.floor((TURN_TIMEOUT_MS - elapsed) / 1000));

        // Broadcast countdown update
        io.to(room.id).emit('turn_timer_update', {
            playerIndex,
            remainingSeconds,
            phase
        });

        // Stop interval when time runs out
        if (remainingSeconds <= 0) {
            const timerData = activeTurnTimers.get(room.id);
            if (timerData?.intervalId) {
                clearInterval(timerData.intervalId);
            }
        }
    }, COUNTDOWN_INTERVAL_MS);

    // Timeout handler - executes when time runs out
    const timeoutId = setTimeout(() => {
        console.log(`⏰ TIMEOUT! Player ${currentPlayer.name} didn't act in ${TURN_TIMEOUT_MS / 1000}s. Skipping turn...`);

        // Clear interval
        clearInterval(intervalId);
        activeTurnTimers.delete(room.id);

        // Broadcast timeout event
        io.to(room.id).emit('turn_timeout', {
            playerIndex,
            playerName: currentPlayer.name,
            phase
        });

        // Handle timeout based on game phase
        handleTurnTimeout(io, room, playerIndex, phase);
    }, TURN_TIMEOUT_MS);

    // Store both IDs
    activeTurnTimers.set(room.id, {
        timeoutId,
        intervalId,
        startTime,
        phase,
        playerIndex
    });
}

/**
 * Handles what happens when a turn times out (AFK - still connected but not acting)
 */
function handleTurnTimeout(io, room, playerIndex, phase) {
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
function handleNextTurn(io, room) {
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
function declareWinner(io, room, winnerIdx) {
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
function getNextPlayer(current, activeColors) {
    if (!activeColors || activeColors.length === 0) return 0;
    const currentIndex = activeColors.indexOf(current);
    if (currentIndex === -1) return activeColors[0];
    const nextIndex = (currentIndex + 1) % activeColors.length;
    return activeColors[nextIndex];
}

/**
 * Handles the pre-game countdown and transitions the room to ACTIVE
 */
function startGameCountdown(io, room, roomId) {
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

    const countdownInterval = setInterval(() => {
        countdown--;

        const connectedNow = room.players.filter(p => p && p.socketId).length;
        const totalPlayersNeeded = room.players.filter(p => p).length;
        console.log(`⏳ Countdown: ${countdown}s | Sockets: ${connectedNow}/${totalPlayersNeeded}`);

        io.to(room.id).emit('countdown_tick', {
            remaining: countdown,
            connectedPlayers: connectedNow,
            totalPlayers: totalPlayersNeeded
        });

        if (countdown <= 0) {
            clearInterval(countdownInterval);

            // STEP 3: Start the game
            room.status = "ACTIVE";
            room._gameStartedAt = Date.now(); // For duration tracking
            console.log(`🎮 Game Starting: Room ${roomId}`);
            console.log(`📋 Socket states:`, room.players.filter(p => p).map(p => `${p.name}: ${p.socketId ? '✅' : '❌'}`));
            console.log(`📝 Blockchain Event: GAME_STARTED | Room: ${roomId} | Players: ${room.players.filter(p => p).map(p => p.address).join(', ')}`);

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
            const playerIndex = room.players.findIndex(p => p && p.address?.toLowerCase() === playerAddress.toLowerCase());
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
                    // During countdown, just confirm connection but don't enable rolling
                    console.log(`⏳ Player ${player.name} connected during countdown - waiting for game start`);
                    socket.emit('state_update', {
                        gamePhase: 'COUNTDOWN',
                        msg: 'Waiting for countdown...'
                    });
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

            const validMove = room.gameState.validMoves.find(m => m.tokenIndex === tokenIndex);
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
                validMove.captures.forEach(capture => {
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
                declareWinner(io, room, newState.winner);
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
            const pIdx = room.players.findIndex(p => p && p.socketId === socket.id);
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

app.get('/', (req, res) => res.json({
    message: "GoLudo Backend v4 (Production Ready)",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
}));

/**
 * Health Check Endpoint
 * Used by Railway/Docker for container health monitoring
 */
app.get('/health', (req, res) => {
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
app.get('/metrics', (req, res) => {
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

app.post('/api/payout/sign', async (req, res) => {
    const { roomId, winner } = req.body;
    const normalizedId = roomId?.toLowerCase();

    // CRITICAL SECURITY CHECK
    const room = activeRooms.find(r => r.id?.toLowerCase() === normalizedId);

    if (!room) {
        return res.status(404).json({ error: "Room not found on server" });
    }

    if (!room.gameState || room.gameState.gamePhase !== 'WIN') {
        return res.status(400).json({ error: "Game is not finished yet" });
    }

    const winnerIdx = room.gameState.winner;
    const actualWinner = room.players[winnerIdx];

    if (!actualWinner || actualWinner.address?.toLowerCase() !== winner?.toLowerCase()) {
        console.warn(`🚨 Unauthorized payout signature attempt for room ${roomId}. Requested: ${winner}, Actual: ${actualWinner?.address}`);
        return res.status(403).json({ error: "Unauthorized winner" });
    }

    try {
        // 🔗 PHASE 5: Fetch pot amount directly from blockchain (trustless)
        const contractRoom = await getRoomStateFromContract(roomId);
        const potAmount = contractRoom.pot;

        console.log(`📋 Blockchain Event: GAME_FINISHED | Room: ${roomId} | Winner: ${winner} | Pot: ${potAmount}`);

        const payoutProof = await signPayout(roomId, winner, potAmount);
        res.json(payoutProof);
    } catch (e) {
        console.error("❌ Sign Payout Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/rooms', (req, res) => res.json(activeRooms));

app.post('/api/rooms/create', async (req, res) => {
    let { roomId, txHash, stake, maxPlayers, creatorName, creatorAddress } = req.body;
    roomId = roomId?.toLowerCase();

    // ✅ PHASE 5: Verify transaction on blockchain
    if (txHash) {
        try {
            await verifyRoomCreation(roomId, txHash, creatorAddress, stake);
            console.log(`✅ Room creation verified on-chain: ${roomId}`);
        } catch (error) {
            console.warn(`🚨 Room creation verification failed: ${error.message}`);
            return res.status(403).json({
                error: "Transaction verification failed",
                details: error.message
            });
        }
    } else {
        console.warn(`⚠️ Room creation without txHash (legacy mode): ${roomId}`);
    }

    if (activeRooms.find(r => r.id?.toLowerCase() === roomId)) return res.status(400).json({ error: "Room exists" });

    const colorMap = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };
    const creatorColorIndex = colorMap[req.body.color?.toLowerCase() || 'red'];

    const newRoom = {
        id: roomId,
        stake,
        maxPlayers: parseInt(maxPlayers),
        // Initialize with 4 empty slots to match board colors (0-Red, 1-Green, 2-Yellow, 3-Blue)
        players: [null, null, null, null],
        gameState: null,
        status: "WAITING",
        createdAt: Date.now() // Track creation time for cleanup
    };

    // Place creator in their chosen color slot
    newRoom.players[creatorColorIndex] = {
        name: creatorName,
        address: creatorAddress,
        color: req.body.color || 'red'
    };

    activeRooms.push(newRoom);
    console.log(`🏠 Room Created: ${roomId} (Total active: ${activeRooms.length})`);
    console.log(`📝 Blockchain Event: ROOM_CREATED | Room: ${roomId} | Creator: ${creatorAddress} | Stake: ${stake}`);
    res.json({ success: true, room: newRoom });
});

app.post('/api/rooms/join', async (req, res) => {
    let { roomId, txHash, playerName, playerAddress, color } = req.body;
    roomId = roomId?.toLowerCase();
    const room = activeRooms.find(r => r.id?.toLowerCase() === roomId);

    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }

    // ✅ PHASE 5: Verify transaction on blockchain
    if (txHash) {
        try {
            await verifyRoomJoin(roomId, txHash, playerAddress, room.stake);
            console.log(`✅ Room join verified on-chain: ${roomId}`);
        } catch (error) {
            console.warn(`🚨 Room join verification failed: ${error.message}`);
            return res.status(403).json({
                error: "Transaction verification failed",
                details: error.message
            });
        }
    } else {
        console.warn(`⚠️ Room join without txHash (legacy mode): ${roomId}`);
    }

    // Check if player already in room (by address)
    const existingPlayer = room.players.find(p => p && p.address?.toLowerCase() === playerAddress?.toLowerCase());
    if (existingPlayer) {
        console.log(`✅ Player ${playerName} already in room, not adding duplicate`);
        return res.json({ success: true, room });
    }

    // Check if room is full (counting non-null slots)
    const playerCount = room.players.filter(p => p !== null).length;
    if (playerCount >= room.maxPlayers) {
        return res.status(400).json({ error: "Room is full" });
    }

    // Check if color is taken
    if (room.players.find(p => p && p.color === color)) {
        return res.status(400).json({ error: "Color already taken" });
    }

    // Add player to the specific color slot
    const colorMap = { 'red': 0, 'green': 1, 'yellow': 2, 'blue': 3 };
    const colorIndex = colorMap[color.toLowerCase()];

    room.players[colorIndex] = {
        name: playerName,
        address: playerAddress,
        color: color
    };

    const newPlayerCount = room.players.filter(p => p !== null).length;
    console.log(`➕ Player ${playerName} (${color}) joined room ${roomId}`);
    console.log(`📋 Room now has ${newPlayerCount}/${room.maxPlayers} players:`,
        room.players.filter(p => p).map(p => `${p.name} (${p.color})`));

    // Check if room is now full
    if (newPlayerCount >= room.maxPlayers) {
        room.status = "STARTING";

        // activeColors must be the actual board indices (e.g., [0, 3] for Red vs Blue)
        const activeColors = room.players
            .map((p, idx) => p ? idx : null)
            .filter(idx => idx !== null);

        // Initialize Engine with 4 total slots (matching indices 0-3)
        room.gameState = createInitialState(4, activeColors);

        console.log(`🎮 Room Full: ${roomId} - Waiting for socket connections...`);
        console.log(`📋 Players:`, room.players.filter(p => p).map((p, i) => `Slot ${p.color}: ${p.name}`));

        // ============================================
        // STEP 1: WAIT for ALL socket connections (up to 30 seconds)
        // This gives clients time to navigate and establish WebSocket connections
        // ============================================
        let waitAttempts = 0;
        const maxWaitAttempts = 30; // 30 seconds total

        const waitForSockets = setInterval(() => {
            waitAttempts++;
            const connectedPlayers = room.players.filter(p => p && p.socketId).length;
            const totalPlayersNeeded = room.players.filter(p => p).length;

            console.log(`⏳ Waiting for sockets: ${connectedPlayers}/${totalPlayersNeeded} (attempt ${waitAttempts}/${maxWaitAttempts})`);

            // ✅ Only start countdown when ALL players are connected
            if (connectedPlayers >= totalPlayersNeeded) {
                clearInterval(waitForSockets);
                console.log(`✅ All ${connectedPlayers} socket(s) connected - Starting countdown!`);
                startGameCountdown(io, room, roomId);
                return;
            }

            // ⚠️ Timeout Fallback
            if (waitAttempts >= maxWaitAttempts) {
                clearInterval(waitForSockets);
                if (connectedPlayers >= 1) {
                    console.log(`⚠️ Timeout! Only ${connectedPlayers}/${totalPlayersNeeded} connected. Starting anyway...`);
                    startGameCountdown(io, room, roomId);
                } else {
                    console.log(`❌ No sockets connected after ${waitAttempts}s. Cancelling room.`);
                    room.status = "CANCELLED";
                    io.to(roomId).emit('game_error', { message: 'Match cancelled: No players connected.' });
                    // Cleanup cancelled room after 1 minute
                    setTimeout(() => cleanupRoom(roomId, activeRooms), 60000);
                }
            }
        }, 1000); // Check every 1 second

        // Register interval for cleanup
        registerRoomTimer(roomId, 'socketWaitInterval', waitForSockets);
    }

    res.json({ success: true, room });
});

server.listen(PORT, async () => {
    console.log(`🚀 GoLudo Backend running on http://localhost:${PORT}`);

    // ✅ PHASE 5: Recover active rooms from blockchain on startup
    try {
        const recoveredRooms = await recoverActiveRoomsFromBlockchain();
        activeRooms.push(...recoveredRooms);
        console.log(`♻️ Recovered ${recoveredRooms.length} active Web3 rooms from blockchain`);
    } catch (error) {
        console.error(`⚠️ Session recovery failed: ${error.message}`);
        console.error(`   Server will start with empty room list`);
    }

    // Start periodic cleanup job (runs every 60s)
    startCleanupJob(activeRooms);
    console.log(`🧹 Room cleanup job started (runs every 60s)`);
});
