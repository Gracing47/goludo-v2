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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3333;

let activeRooms = [];

app.use(cors());
app.use(bodyParser.json());

app.use((req, res, next) => {
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

    console.log(`⏰ Starting ${remainingSeconds}s timer for ${currentPlayer.name} (Phase: ${phase})`);

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

        broadcastState(room, `⏰ ${currentPlayer.name} timed out. Turn skipped.`);
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
        console.log(`👤 Waiting for Human Player ${currentPlayer.name} (Socket ${currentPlayer.socketId})`);

        // Start timer for current game phase
        startTurnTimer(io, room, currentPlayerIndex, room.gameState.gamePhase);
        return;
    }

    // Player is NOT connected (disconnected mid-game)
    console.log(`⚠️ Player ${currentPlayerIndex} (${currentPlayer?.name || 'Unknown'}) is disconnected. Skipping turn...`);

    // Auto-skip disconnected players - with small delay to prevent rapid-fire recursion
    broadcastState(room, `⚠️ ${currentPlayer?.name || 'Player'} disconnected. Turn skipped.`);

    setTimeout(() => {
        // Check if anyone is actually still connected before checking next turn
        const anyHumanConnected = room.players.some(p => p.socketId);
        if (!anyHumanConnected) {
            console.log(`⏹️ No human players connected in Room ${room.id}. Pausing turn logic.`);
            return;
        }

        const nextPlayerIdx = getNextPlayer(currentPlayerIndex, room.gameState.activeColors);
        room.gameState.activePlayer = nextPlayerIdx;
        room.gameState.gamePhase = GAME_PHASE.ROLL_DICE;
        room.gameState.validMoves = [];
        room.gameState.diceValue = null;
        room.gameState.consecutiveSixes = 0;
        room.gameState.bonusMoves = 0;

        handleNextTurn(io, room);
    }, 2000); // 2 second delay between skips to prevent stack overflow and give user time to see message
}

// Helper function to get next player
function getNextPlayer(current, activeColors) {
    if (!activeColors || activeColors.length === 0) return 0;
    const currentIndex = activeColors.indexOf(current);
    if (currentIndex === -1) return activeColors[0];
    const nextIndex = (currentIndex + 1) % activeColors.length;
    return activeColors[nextIndex];
}


io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    socket.on('join_match', (data) => {
        // Support both old string format and new object format
        const roomId = (typeof data === 'object') ? data.roomId : data;
        const playerAddress = (typeof data === 'object') ? data.playerAddress : null;

        socket.join(roomId);
        console.log(`👤 Socket ${socket.id} joined Room ${roomId}`);

        // Map Socket ID to Player
        const room = activeRooms.find(r => r.id === roomId);
        if (room && playerAddress) {
            const player = room.players.find(p => p.address?.toLowerCase() === playerAddress.toLowerCase());
            if (player) {
                player.socketId = socket.id;
                console.log(`🔗 Linked Socket ${socket.id} to Player ${player.name} (${player.color})`);

                // CRITICAL FIX: Send immediate state sync if game is active
                // This handles refreshes/reconnections where the client missed previous updates
                if (room.gameState) {
                    console.log(`🔄 Sending immediate state sync to ${player.name}`);
                    // We may need to re-emit game_started so the client enters the 'game' AppState if they were in lobby
                    socket.emit('game_started', room);

                    // Send current board state
                    socket.emit('state_update', {
                        ...room.gameState,
                        currentTurn: room.gameState.activePlayer,
                        turnState: room.gameState.gamePhase === GAME_PHASE.ROLL_DICE ? "WAITING_FOR_ROLL" : "WAITING_FOR_MOVE",
                        lastDice: room.gameState.diceValue,
                        msg: room.gameState.message || "Reconnected"
                    });
                }
            }
        }
    });

    socket.on('roll_dice', ({ roomId, playerAddress }) => {
        const room = activeRooms.find(r => r.id === roomId);
        if (!room || !room.gameState) return;

        const activePlayerIdx = room.gameState.activePlayer;
        const activePlayerObj = room.players[activePlayerIdx]; // FIXED: Direct index lookup

        if (activePlayerObj?.address?.toLowerCase() !== playerAddress?.toLowerCase()) {
            console.log(`❌ Out-of-turn roll attempt by ${playerAddress} (Expected: Player ${activePlayerIdx} - ${activePlayerObj?.address})`);
            return;
        }

        if (room.gameState.gamePhase !== GAME_PHASE.ROLL_DICE) return;

        // Clear turn timer - player acted in time
        clearRoomTimers(room.id);

        const newState = rollDice(room.gameState);
        const rolledValue = newState.diceValue;
        room.gameState = newState;

        console.log(`🎲 Player ${activePlayerIdx} rolled ${rolledValue}`);

        io.to(roomId).emit('dice_rolled', { value: rolledValue, playerIndex: activePlayerIdx });
        broadcastState(room);

        // If no valid moves, auto-skip after brief delay
        if (room.gameState.validMoves.length === 0) {
            setTimeout(() => handleNextTurn(io, room), 1500);
        } else {
            // Player has valid moves - start timer for token selection
            startTurnTimer(io, room, activePlayerIdx, room.gameState.gamePhase);
        }
    });

    socket.on('move_token', ({ roomId, playerAddress, tokenIndex }) => {
        const room = activeRooms.find(r => r.id === roomId);
        if (!room || !room.gameState) return;

        const activePlayerIdx = room.gameState.activePlayer;
        const activePlayerObj = room.players[activePlayerIdx]; // FIXED: Direct index lookup

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
        } else if (newState.gamePhase === GAME_PHASE.BONUS_MOVE) {
            msg = "Bonus Turn! Move again.";
        } else if (newState.diceValue === 6 && newState.gamePhase === GAME_PHASE.ROLL_DICE) {
            msg = "Six! Roll again.";
        }

        broadcastState(room, msg);

        // TRIGGER NEXT TURN (Bot Check)
        // Check for ROLL_DICE or BONUS_MOVE to continue automatic flow
        if (room.gameState.gamePhase === GAME_PHASE.ROLL_DICE || room.gameState.gamePhase === GAME_PHASE.BONUS_MOVE) {
            handleNextTurn(io, room);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
        // Optional: Remove socketId from player to turn them into Bot?
        activeRooms.forEach(room => {
            const player = room.players.find(p => p.socketId === socket.id);
            if (player) {
                player.socketId = null;
                console.log(`⚠️ Player ${player.name} disconnected -> Switched to Bot Mode`);
                // Trigger turn check in case they disconnected *during* their turn
                handleNextTurn(io, room);
            }
        });
    });
});

app.get('/', (req, res) => res.json({ message: "GoLudo Backend v2 (Bot Enabled)" }));

app.post('/api/payout/sign', async (req, res) => {
    // ... same as before
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

    const newRoom = {
        id: roomId,
        stake,
        maxPlayers: parseInt(maxPlayers),
        players: [{ name: creatorName, address: creatorAddress, color: req.body.color || 'red' }],
        gameState: null,
        status: "WAITING"
    };

    activeRooms.push(newRoom);
    console.log(`🏠 Room Created: ${roomId}`);
    res.json({ success: true, room: newRoom });
});

app.post('/api/rooms/join', (req, res) => {
    const { roomId, playerName, playerAddress, color } = req.body;
    const room = activeRooms.find(r => r.id === roomId);

    if (!room) {
        return res.status(404).json({ error: "Room not found" });
    }

    // Check if player already in room (by address)
    const existingPlayer = room.players.find(p => p.address?.toLowerCase() === playerAddress?.toLowerCase());
    if (existingPlayer) {
        console.log(`✅ Player ${playerName} already in room, not adding duplicate`);
        return res.json({ success: true, room });
    }

    // Check if room is full
    if (room.players.length >= room.maxPlayers) {
        return res.status(400).json({ error: "Room is full" });
    }

    // Check if color is taken
    if (room.players.find(p => p.color === color)) {
        return res.status(400).json({ error: "Color already taken" });
    }

    // Add player
    room.players.push({
        name: playerName,
        address: playerAddress,
        color: color
    });

    console.log(`➕ Player ${playerName} (${color}) joined room ${roomId}`);
    console.log(`📋 Room now has ${room.players.length}/${room.maxPlayers} players:`,
        room.players.map(p => `${p.name} (${p.color})`));

    // Check if room is now full
    if (room.players.length >= room.maxPlayers) {
        room.status = "ACTIVE";

        // CRITICAL FIX: activeColors must be sequential [0, 1] or [0, 1, 2] or [0, 1, 2, 3]
        // The engine uses these as player indices, NOT as color IDs
        // We store the actual colors in room.players[i].color for visual display
        const activeColors = room.players.map((_, index) => index);

        // Initialize Engine
        room.gameState = createInitialState(room.players.length, activeColors);

        console.log(`🎮 Game Starting: Room ${roomId}`);
        console.log(`📋 Players in room:`, room.players.map((p, i) => `Player ${i}: ${p.name} (${p.color}) - Socket: ${p.socketId || 'NOT CONNECTED'}`));
        io.to(roomId).emit('game_started', room);
        broadcastState(room, "Game Started!");

        // KICKSTART TURN LOGIC - Delay to allow socket connections to establish
        // Players need time to receive game_started and emit join_match
        // INCREASED to 5000ms to fix race condition with socket linking
        setTimeout(() => {
            console.log(`⏰ Starting turn logic. Current socket states:`, room.players.map(p => `${p.name}: ${p.socketId ? 'Connected' : 'Bot'}`));
            handleNextTurn(io, room);
        }, 5000);
    }

    res.json({ success: true, room });
});

server.listen(PORT, () => {
    console.log(`🚀 GoLudo Backend running on http://localhost:${PORT}`);
});
