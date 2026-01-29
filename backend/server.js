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
import { registerRoomTimer, clearAllRoomTimers, cleanupRoom, startCleanupJob } from './roomManager.js';

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
const COUNTDOWN_INTERVAL_MS = 1000; // Update every second

// Store both timeout and interval for each room
const activeTurnTimers = new Map(); // roomId -> { timeoutId, intervalId, startTime, phase }

/**
 * Clears all timers for a room (timeout + countdown interval)
 */
function clearRoomTimers(roomId) {
    const timerData = activeTurnTimers.get(roomId);
    if (timerData) {
        if (timerData.timeoutId) clearTimeout(timerData.timeoutId);
        if (timerData.intervalId) clearInterval(timerData.intervalId);
        activeTurnTimers.delete(roomId);
        console.log(`⏹️ Cleared timers for room ${roomId}`);
    }
}

/**
 * Starts a countdown timer with live updates
 */
function startTurnTimer(io, room, playerIndex, phase) {
    const currentPlayer = room.players[playerIndex];

    // Clear any existing timers first
    clearRoomTimers(room.id);

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
 * Handles what happens when a turn times out
 */
function handleTurnTimeout(io, room, playerIndex, phase) {
    const currentPlayer = room.players[playerIndex];

    if (phase === GAME_PHASE.ROLL_DICE) {
        // They didn't roll - skip to next player
        const nextPlayerIdx = getNextPlayer(playerIndex, room.gameState.activeColors);
        room.gameState.activePlayer = nextPlayerIdx;
        room.gameState.consecutiveSixes = 0;

        broadcastState(room, `⏰ ${currentPlayer?.name || 'Player'} timed out. Turn skipped.`);
        handleNextTurn(io, room);
    } else if (phase === GAME_PHASE.SELECT_TOKEN || phase === GAME_PHASE.BONUS_MOVE) {
        // They didn't select a token - forfeit move and pass turn
        const nextPlayerIdx = getNextPlayer(playerIndex, room.gameState.activeColors);
        room.gameState.activePlayer = nextPlayerIdx;
        room.gameState.gamePhase = GAME_PHASE.ROLL_DICE;
        room.gameState.validMoves = [];
        room.gameState.diceValue = null;
        room.gameState.consecutiveSixes = 0;
        room.gameState.bonusMoves = 0;

        broadcastState(room, `⏰ ${currentPlayer.name} timed out. Move forfeited.`);
        handleNextTurn(io, room);
    }
}

/**
 * Main turn handler - manages turn flow and timer initialization
 */
function handleNextTurn(io, room) {
    const currentPlayerIndex = room.gameState.activePlayer;
    const currentPlayer = room.players[currentPlayerIndex];
    const colorName = currentPlayer?.color || 'unknown';

    console.log(`🔄 Turn switched to Player ${currentPlayerIndex} (${colorName})`);

    // Check if player is connected
    if (currentPlayer && currentPlayer.socketId) {
        console.log(`👤 Waiting for Human Player ${currentPlayer?.name || 'Player'} (Socket ${currentPlayer.socketId})`);

        // Start timer for current game phase
        startTurnTimer(io, room, currentPlayerIndex, room.gameState.gamePhase);
        return;
    }

    // Player is NOT connected (disconnected mid-game)
    // Give 2 seconds grace period for reconnection before skipping
    console.log(`⚠️ Player ${currentPlayerIndex} (${currentPlayer?.name || 'Unknown'}) is disconnected. Waiting 2s for recovery...`);

    setTimeout(() => {
        // Check again after grace period
        const roomRefreshed = activeRooms.find(r => r.id === room.id);
        const playerRefreshed = roomRefreshed?.players[currentPlayerIndex];

        if (playerRefreshed && !playerRefreshed.socketId) {
            console.log(`⏰ Recovery timeout: Skipping turn for ${playerRefreshed.name}`);
            broadcastState(room, `⚠️ ${playerRefreshed.name} disconnected. Turn skipped.`);

            // Proceed to next
            const nextPlayerIdx = getNextPlayer(currentPlayerIndex, room.gameState.activeColors);
            room.gameState.activePlayer = nextPlayerIdx;
            room.gameState.gamePhase = GAME_PHASE.ROLL_DICE;
            room.gameState.validMoves = []; // Clear any pending moves
            room.gameState.diceValue = null;
            room.gameState.consecutiveSixes = 0;
            room.gameState.bonusMoves = 0;

            broadcastState(room); // Update state after skipping
            handleNextTurn(io, room);
        } else {
            console.log(`✅ Player recovered during grace period. Continuing turn.`);
            // If player reconnected, restart their turn timer
            if (playerRefreshed && playerRefreshed.socketId) {
                startTurnTimer(io, room, currentPlayerIndex, room.gameState.gamePhase);
            }
        }
    }, 2000);
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
            console.log(`🎮 Game Starting: Room ${roomId}`);
            console.log(`📋 Socket states:`, room.players.filter(p => p).map(p => `${p.name}: ${p.socketId ? '✅' : '❌'}`));

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
        const roomId = (typeof data === 'object') ? data.roomId : data;
        const playerAddress = (typeof data === 'object') ? data.playerAddress : null;

        socket.join(roomId);

        // Map Socket ID to Player
        const room = activeRooms.find(r => r.id === roomId);
        if (room && playerAddress) {
            const player = room.players.find(p => p && p.address?.toLowerCase() === playerAddress.toLowerCase());
            if (player) {
                player.socketId = socket.id;
                console.log(`🔗 Linked Socket ${socket.id} to Player ${player.name} (${player.color})`);

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
            const room = activeRooms.find(r => r.id === roomId);
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
            const room = activeRooms.find(r => r.id === roomId);
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
            room.gameState = newState;

            let msg = null;
            if (newState.gamePhase === 'WIN') {
                msg = `🎉 Player ${newState.winner + 1} Wins!`;
                // Clear all timers on game end
                clearRoomTimers(room.id);
                clearAllRoomTimers(room.id); // Also clear lifecycle timers

                // Schedule room cleanup after 5 minutes (give time for payout claims)
                setTimeout(() => {
                    cleanupRoom(room.id, activeRooms);
                }, 5 * 60 * 1000);
            } else if (newState.gamePhase === GAME_PHASE.BONUS_MOVE) {
                msg = "Bonus Turn! Move again.";
            } else if (newState.diceValue === 6 && newState.gamePhase === GAME_PHASE.ROLL_DICE) {
                msg = "Six! Roll again.";
            }

            broadcastState(room, msg);

            // TRIGGER NEXT TURN OR BONUS MOVE
            if (newState.gamePhase === 'WIN') {
                // Game over - do nothing
            } else if (newState.gamePhase === GAME_PHASE.BONUS_MOVE) {
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
            const player = room.players.find(p => p && p.socketId === socket.id);
            if (player) {
                player.socketId = null;
                console.log(`⚠️ Player ${player.name} disconnected -> Switched to Bot Mode`);
                // Trigger turn check in case they disconnected *during* their turn
                handleNextTurn(io, room);
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
    const { roomId, winner, amount } = req.body;
    try {
        const payoutProof = await signPayout(roomId, winner, amount);
        res.json(payoutProof);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/rooms', (req, res) => res.json(activeRooms));

app.post('/api/rooms/create', (req, res) => {
    const { roomId, stake, maxPlayers, creatorName, creatorAddress } = req.body;
    if (activeRooms.find(r => r.id === roomId)) return res.status(400).json({ error: "Room exists" });

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
    res.json({ success: true, room: newRoom });
});

app.post('/api/rooms/join', (req, res) => {
    const { roomId, playerName, playerAddress, color } = req.body;
    const room = activeRooms.find(r => r.id === roomId);

    if (!room) {
        return res.status(404).json({ error: "Room not found" });
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

server.listen(PORT, () => {
    console.log(`🚀 GoLudo Backend running on http://localhost:${PORT}`);

    // Start periodic cleanup job (runs every 60s)
    startCleanupJob(activeRooms);
    console.log(`🧹 Room cleanup job started (runs every 60s)`);
});
