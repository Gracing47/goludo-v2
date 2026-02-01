import { ethers } from "ethers";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

/**
 * CONTRACT VERIFIER MODULE
 * 
 * Server-side blockchain verification to prevent fake room creation/joining.
 * Verifies that transactions actually occurred on Flare/Coston2 before
 * accepting room operations.
 * 
 * @module contractVerifier
 */

// ============================================
// CONFIGURATION
// ============================================

const FLARE_RPC_URL = process.env.FLARE_RPC_URL;
const VAULT_ADDRESS = process.env.VITE_LUDOVAULT_ADDRESS;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "114");

// ============================================
// EMBEDDED MINIMAL ABI (Eliminates filesystem dependency for Railway)
// Only includes events and functions needed for verification
// ============================================

const LUDOVAULT_MINIMAL_ABI = [
    // Events for transaction verification
    "event RoomCreated(bytes32 indexed roomId, address indexed creator, uint256 entryAmount, uint256 maxPlayers)",
    "event RoomJoined(bytes32 indexed roomId, address indexed opponent, uint256 currentPot, uint256 playersJoined)",
    "event RoomCancelled(bytes32 indexed roomId, address indexed creator, uint256 refundAmount)",
    "event GameFinished(bytes32 indexed roomId, address indexed winner, uint256 payout, uint256 fee)",

    // View functions
    "function rooms(bytes32 roomId) view returns (address creator, uint256 maxPlayers, uint256 entryAmount, uint256 pot, uint256 createdAt, uint8 status)",
    "function getParticipants(bytes32 roomId) view returns (address[])"
];

// ============================================
// GRACEFUL DEGRADATION
// ============================================
// If RPC URL or Vault address is missing, verification is DISABLED but server still runs
// This allows deployment without full blockchain verification configured

let VERIFICATION_ENABLED = true;
let provider = null;
let ludoVaultContract = null;

if (!FLARE_RPC_URL) {
    console.warn("⚠️ FLARE_RPC_URL missing - On-chain verification DISABLED");
    console.warn("   Add FLARE_RPC_URL to Railway environment variables for production security");
    VERIFICATION_ENABLED = false;
}

if (!VAULT_ADDRESS) {
    console.warn("⚠️ VITE_LUDOVAULT_ADDRESS missing - On-chain verification DISABLED");
    VERIFICATION_ENABLED = false;
}

if (VERIFICATION_ENABLED) {
    try {
        // Create a custom Network for Coston2/Flare that explicitly disables ENS
        // This prevents ethers from trying to resolve ENS names on networks that don't support it
        const flareNetwork = new ethers.Network("coston2", CHAIN_ID);
        // Explicitly set no ENS address to prevent ENS resolution attempts
        flareNetwork.attachPlugin(new ethers.EnsPlugin(null));

        // Initialize provider with custom network
        provider = new ethers.JsonRpcProvider(FLARE_RPC_URL, flareNetwork, {
            staticNetwork: flareNetwork // Prevents network auto-detection which can trigger ENS
        });

        // Create contract instance with embedded ABI (no filesystem dependency!)
        ludoVaultContract = new ethers.Contract(VAULT_ADDRESS, LUDOVAULT_MINIMAL_ABI, provider);

        console.log(`🔗 Contract Verifier initialized: ${VAULT_ADDRESS} on Chain ${CHAIN_ID}`);
    } catch (error) {
        console.error(`❌ Failed to initialize Contract Verifier: ${error.message}`);
        console.warn("   On-chain verification DISABLED");
        VERIFICATION_ENABLED = false;
    }
} else {
    console.log("📋 Server running in LEGACY MODE (no blockchain verification)");
}


// ============================================
// VERIFICATION FUNCTIONS
// ============================================

/**
 * Verifies that a room creation transaction actually occurred on-chain
 * 
 * @param {string} roomId - bytes32 room ID
 * @param {string} txHash - Transaction hash to verify
 * @param {string} expectedCreator - Expected creator address
 * @param {number} expectedStake - Expected stake amount (in token units, not Wei)
 * @returns {Promise<boolean>} - True if verified
 * @throws {Error} - If verification fails
 */
export async function verifyRoomCreation(roomId, txHash, expectedCreator, expectedStake) {
    // Skip verification if not configured
    if (!VERIFICATION_ENABLED) {
        console.log(`⏭️ Skipping room creation verification (LEGACY MODE)`);
        return true;
    }

    try {
        // Normalize inputs
        const normalizedRoomId = roomId.toLowerCase();
        const normalizedCreator = expectedCreator.toLowerCase();
        const expectedStakeWei = ethers.parseEther(expectedStake.toString());

        console.log(`🔍 Verifying room creation: ${normalizedRoomId}`);
        console.log(`   TX Hash: ${txHash}`);
        console.log(`   Expected Creator: ${normalizedCreator}`);
        console.log(`   Expected Stake: ${expectedStake} (${expectedStakeWei} Wei)`);

        // Fetch transaction receipt with retries (RPC lag)
        let receipt = null;
        for (let i = 0; i < 5; i++) {
            receipt = await provider.getTransactionReceipt(txHash);
            if (receipt) break;
            console.log(`   ⏳ Transaction not found yet, retrying in 2s... (${i + 1}/5)`);
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!receipt) {
            throw new Error("Transaction not found on blockchain after 10s");
        }

        if (receipt.status !== 1) {
            throw new Error("Transaction failed on blockchain");
        }

        // Parse logs for RoomCreated event
        const roomCreatedEvent = receipt.logs
            .map(log => {
                try {
                    return ludoVaultContract.interface.parseLog(log);
                } catch {
                    return null;
                }
            })
            .find(event => event && event.name === "RoomCreated");

        if (!roomCreatedEvent) {
            throw new Error("RoomCreated event not found in transaction logs");
        }

        // Verify event parameters
        const eventRoomId = roomCreatedEvent.args.roomId.toLowerCase();
        const eventCreator = roomCreatedEvent.args.creator.toLowerCase();
        const eventAmount = roomCreatedEvent.args.entryAmount;

        if (eventRoomId !== normalizedRoomId) {
            throw new Error(`Room ID mismatch: expected ${normalizedRoomId}, got ${eventRoomId}`);
        }

        if (eventCreator !== normalizedCreator) {
            throw new Error(`Creator mismatch: expected ${normalizedCreator}, got ${eventCreator}`);
        }

        if (eventAmount !== expectedStakeWei) {
            throw new Error(`Stake amount mismatch: expected ${expectedStakeWei}, got ${eventAmount}`);
        }

        console.log(`✅ Room creation verified successfully`);
        return true;

    } catch (error) {
        console.error(`❌ Room creation verification failed: ${error.message}`);
        throw error;
    }
}

/**
 * Verifies that a room join transaction actually occurred on-chain
 * 
 * @param {string} roomId - bytes32 room ID
 * @param {string} txHash - Transaction hash to verify
 * @param {string} expectedJoiner - Expected joiner address
 * @param {number} expectedStake - Expected stake amount (in token units, not Wei)
 * @returns {Promise<boolean>} - True if verified
 * @throws {Error} - If verification fails
 */
export async function verifyRoomJoin(roomId, txHash, expectedJoiner, expectedStake) {
    // Skip verification if not configured
    if (!VERIFICATION_ENABLED) {
        console.log(`⏭️ Skipping room join verification (LEGACY MODE)`);
        return true;
    }

    try {
        // Normalize inputs
        const normalizedRoomId = roomId.toLowerCase();
        const normalizedJoiner = expectedJoiner.toLowerCase();
        const expectedStakeWei = ethers.parseEther(expectedStake.toString());

        console.log(`🔍 Verifying room join: ${normalizedRoomId}`);
        console.log(`   TX Hash: ${txHash}`);
        console.log(`   Expected Joiner: ${normalizedJoiner}`);
        console.log(`   Expected Stake: ${expectedStake} (${expectedStakeWei} Wei)`);

        // Fetch transaction receipt with retries (RPC lag)
        let receipt = null;
        for (let i = 0; i < 5; i++) {
            receipt = await provider.getTransactionReceipt(txHash);
            if (receipt) break;
            console.log(`   ⏳ Transaction not found yet, retrying in 2s... (${i + 1}/5)`);
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!receipt) {
            throw new Error("Transaction not found on blockchain after 10s");
        }

        if (receipt.status !== 1) {
            throw new Error("Transaction failed on blockchain");
        }

        // Parse logs for RoomJoined event
        const roomJoinedEvent = receipt.logs
            .map(log => {
                try {
                    return ludoVaultContract.interface.parseLog(log);
                } catch {
                    return null;
                }
            })
            .find(event => event && event.name === "RoomJoined");

        if (!roomJoinedEvent) {
            throw new Error("RoomJoined event not found in transaction logs");
        }

        // Verify event parameters
        const eventRoomId = roomJoinedEvent.args.roomId.toLowerCase();
        const eventOpponent = roomJoinedEvent.args.opponent.toLowerCase();
        const eventTotalPot = roomJoinedEvent.args.totalPot;

        if (eventRoomId !== normalizedRoomId) {
            throw new Error(`Room ID mismatch: expected ${normalizedRoomId}, got ${eventRoomId}`);
        }

        if (eventOpponent !== normalizedJoiner) {
            throw new Error(`Joiner mismatch: expected ${normalizedJoiner}, got ${eventOpponent}`);
        }

        // Total pot should be 2x stake (creator + joiner)
        const expectedTotalPot = expectedStakeWei * 2n;
        if (eventTotalPot !== expectedTotalPot) {
            throw new Error(`Total pot mismatch: expected ${expectedTotalPot}, got ${eventTotalPot}`);
        }

        console.log(`✅ Room join verified successfully`);
        return true;

    } catch (error) {
        console.error(`❌ Room join verification failed: ${error.message}`);
        throw error;
    }
}

/**
 * Fetches the current state of a room from the smart contract
 * 
 * @param {string} roomId - bytes32 room ID
 * @returns {Promise<Object>} - Room state object
 */
export async function getRoomStateFromContract(roomId) {
    if (!VERIFICATION_ENABLED) {
        throw new Error("Contract verification not configured");
    }

    try {
        // New struct: (creator, maxPlayers, entryAmount, pot, createdAt, status)
        const room = await ludoVaultContract.rooms(roomId);
        const participants = await ludoVaultContract.getParticipants(roomId);

        return {
            creator: room[0],
            maxPlayers: Number(room[1]),
            entryAmount: room[2].toString(),
            pot: room[3].toString(),
            createdAt: Number(room[4]),
            status: Number(room[5]), // 0=EMPTY, 1=WAITING, 2=ACTIVE, 3=FINISHED, 4=CANCELLED
            participants: participants
        };
    } catch (error) {
        console.error(`❌ Failed to fetch room state: ${error.message}`);
        throw error;
    }
}

/**
 * Recovers active rooms from blockchain events (for server restart)
 * 
 * @returns {Promise<Array>} - Array of room objects
 */
export async function recoverActiveRoomsFromBlockchain() {
    if (!VERIFICATION_ENABLED) {
        console.log(`⏭️ Session recovery skipped (verification not configured)`);
        return [];
    }

    try {
        // Query RoomCreated events from last 24 hours
        const currentBlock = await provider.getBlockNumber();
        const blocksPerDay = Math.floor((24 * 60 * 60) / 2); // ~2s block time on Flare
        let fromBlock = Math.max(0, currentBlock - blocksPerDay);

        // RPC might have tight block range limits (e.g., 30 blocks)
        const CHUNK_SIZE = 30;
        const MAX_TOTAL_SCANNED = 3000; // Limit total scan to avoid too many RPC calls (covers ~2 hours)

        // Adjust fromBlock to stay within a reasonable limit if needed
        fromBlock = Math.max(fromBlock, currentBlock - MAX_TOTAL_SCANNED);

        console.log(`   Scanning blocks ${fromBlock} to ${currentBlock} in chunks of ${CHUNK_SIZE}`);

        const createdEvents = [];
        for (let start = fromBlock; start < currentBlock; start += CHUNK_SIZE) {
            const end = Math.min(start + CHUNK_SIZE - 1, currentBlock);
            try {
                const chunk = await ludoVaultContract.queryFilter(
                    ludoVaultContract.filters.RoomCreated(),
                    start,
                    end
                );
                createdEvents.push(...chunk);
            } catch (err) {
                console.warn(`   ⚠️ Failed to scan chunk ${start}-${end}: ${err.message}`);
                // Continue to next chunk instead of failing entirely
            }
        }

        console.log(`   Found ${createdEvents.length} RoomCreated events in scan window`);

        const recoveredRooms = [];

        for (const event of createdEvents) {
            const roomId = event.args.roomId;

            // Fetch current room state from contract
            const roomState = await getRoomStateFromContract(roomId);

            // Only recover ACTIVE rooms (status = 2)
            if (roomState.status === 2) {
                console.log(`   ✅ Recovering ACTIVE room: ${roomId}`);

                // Reconstruct room object matching server format
                const room = {
                    id: roomId.toLowerCase(),
                    stake: parseFloat(ethers.formatEther(roomState.entryAmount)),
                    maxPlayers: 2, // Web3 matches are always 2-player
                    players: [null, null, null, null],
                    gameState: null, // Will be reconstructed by game engine if needed
                    status: "ACTIVE",
                    createdAt: roomState.createdAt * 1000 // Convert to milliseconds
                };

                // Note: We don't have player names/colors from blockchain
                // These will be re-established when players reconnect via WebSocket
                room.players[0] = {
                    address: roomState.creator,
                    name: "Player 1", // Placeholder
                    color: "red"
                };

                room.players[1] = {
                    address: roomState.opponent,
                    name: "Player 2", // Placeholder
                    color: "blue"
                };

                recoveredRooms.push(room);
            }
        }

        console.log(`♻️ Recovered ${recoveredRooms.length} active rooms`);
        return recoveredRooms;

    } catch (error) {
        console.error(`❌ Session recovery failed: ${error.message}`);
        throw error;
    }
}

// ============================================
// EXPORTS
// ============================================

export {
    provider,
    ludoVaultContract,
    VAULT_ADDRESS,
    CHAIN_ID,
    VERIFICATION_ENABLED
};
