import { io, Socket } from 'socket.io-client';
import crypto from 'crypto';

const SERVER_URL = 'http://localhost:3333';
const ROOM_ID = '0x' + crypto.randomBytes(32).toString('hex');

interface PlayerSim {
    name: string;
    address: string;
    socket: Socket | null;
    index: number | null;
}

const players: PlayerSim[] = [
    { name: 'Sim1', address: '0x1111111111111111111111111111111111111111', socket: null, index: null },
    { name: 'Sim2', address: '0x2222222222222222222222222222222222222222', socket: null, index: null }
];

let moveCount = 0;
const MAX_MOVES = 120;
let isGameOver = false;

async function setupPlayer(p: PlayerSim) {
    return new Promise<void>((resolve) => {
        const socket = io(SERVER_URL, {
            query: { roomId: ROOM_ID, userAddress: p.address },
            transports: ['websocket']
        });

        socket.on('connect', () => {
            console.log(`✅ ${p.name} connected (${socket.id})`);
            socket.emit('join_match', { roomId: ROOM_ID, playerAddress: p.address });
        });

        socket.on('state_update', (state: any) => {
            if (isGameOver) return;

            // Find my index if not set
            if (p.index === null && state.tokens) {
                // In this sim, we assume players join in order or we find by address if available
                // But state_update doesn't always have addresses. 
                // We'll rely on the join_match logic or first blood logic.
                // For simplicity in stress test, we'll assign indices based on connection order 
                // but better to actually know who we are.
            }

            if (state.gamePhase === 'WIN') {
                console.log(`🏆 GAME OVER! Winner: ${state.winner}`);
                isGameOver = true;
                process.exit(0);
            }

            if (state.activePlayer === p.index && !state.isMoving && !state.isRolling) {
                handleTurn(p, state);
            }
        });

        socket.on('game_started', (room: any) => {
            const idx = room.players.findIndex((pl: any) => pl?.address.toLowerCase() === p.address.toLowerCase());
            p.index = idx;
            console.log(`🎮 Game Started! ${p.name} is index ${p.index}`);
        });

        p.socket = socket;
        resolve();
    });
}

function handleTurn(p: PlayerSim, state: any) {
    if (moveCount >= MAX_MOVES) {
        console.log("🛑 Max moves reached. Stopping sim.");
        process.exit(0);
    }

    if (state.gamePhase === 'ROLL_DICE') {
        console.log(`🎲 ${p.name} rolling... (Move #${++moveCount})`);
        p.socket?.emit('roll_dice', { roomId: ROOM_ID, playerAddress: p.address });
    } else if (state.gamePhase === 'SELECT_TOKEN' || state.gamePhase === 'BONUS_MOVE') {
        if (state.validMoves && state.validMoves.length > 0) {
            const move = state.validMoves[Math.floor(Math.random() * state.validMoves.length)];
            console.log(`➡️ ${p.name} moving token ${move.tokenIndex}`);
            p.socket?.emit('move_token', { roomId: ROOM_ID, playerAddress: p.address, tokenIndex: move.tokenIndex });
        }
    }
}

// Start simulation
async function run() {
    console.log(`🚀 Starting Ludo Stress Test (Room: ${ROOM_ID})`);

    // Create room via API first
    try {
        const res = await fetch(`${SERVER_URL}/api/rooms/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomId: ROOM_ID,
                creatorAddress: players[0].address,
                creatorName: players[0].name,
                stake: "0.01",
                maxPlayers: 2,
                color: 'red',
                mode: 'classic',
                txHash: "0x" + crypto.randomBytes(32).toString('hex')
            })
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to create room: ${res.status} ${errorText}`);
        }
        console.log("📂 Room created on server");
    } catch (e) {
        console.error("❌ Setup error:", e);
        process.exit(1);
    }

    await setupPlayer(players[0]);

    // Simulate join delay
    setTimeout(async () => {
        try {
            const res = await fetch(`${SERVER_URL}/api/rooms/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: ROOM_ID,
                    playerAddress: players[1].address,
                    playerName: players[1].name,
                    color: 'blue',
                    txHash: "0x" + crypto.randomBytes(32).toString('hex')
                })
            });
            if (!res.ok) {
                const errorText = await res.text();
                console.error("❌ Join error:", res.status, errorText);
            } else {
                console.log("📂 Sim2 joined successfully");
            }
        } catch (e) {
            console.error("❌ Join catch:", e);
        }

        await setupPlayer(players[1]);
    }, 2000);

    // Random disconnect simulation
    setInterval(() => {
        if (isGameOver) return;
        if (Math.random() > 0.8) {
            const p = players[Math.floor(Math.random() * players.length)];
            console.log(`🔌 [SIM] Simulating disconnect for ${p.name}...`);
            p.socket?.disconnect();

            setTimeout(() => {
                console.log(`🔌 [SIM] Reconnecting ${p.name}...`);
                p.socket?.connect();
            }, 5000);
        }
    }, 15000);
}

run();
