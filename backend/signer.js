import { ethers } from "ethers";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

/**
 * GoLudo Backend Signer
 * 
 * Verifies game results and generates EIP-712 signatures 
 * that the LudoVault smart contract will accept for payouts.
 */

// 🌍 Configuration from .env
const SIGNER_PRIVATE_KEY = process.env.SERVER_SIGNER_PRIVATE_KEY;
const VAULT_ADDRESS = process.env.VITE_LUDOVAULT_ADDRESS || process.env.LUDOVAULT_ADDRESS;
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "114"); // Default to Coston2, override for Mainnet

if (!SIGNER_PRIVATE_KEY || !VAULT_ADDRESS) {
    console.error("❌ SIGNER_PRIVATE_KEY or LUDOVAULT_ADDRESS missing in .env");
    // process.exit(1); // Don't crash entirely if just testing locally without keys
}

let wallet;
if (SIGNER_PRIVATE_KEY) {
    wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);
}

/**
 * Generates an EIP-712 signature for a winner payout
 * 
 * @param {string} roomId The bytes32 ID of the room
 * @param {string} winnerAddress The Ethereum address of the winner
 * @param {string} amountInWei Total pot amount to be paid out (before fee)
 * @returns {Promise<Object>} Object containing the signature and parameters
 */
export async function signPayout(roomId, winnerAddress, amountInWei) {
    if (!wallet) throw new Error("Signer wallet not initialized");

    // 1. Prepare unique nonce and deadline (24 hours from now)
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours

    // 2. Define EIP-712 Domain
    const domain = {
        name: "LudoVault",
        version: "1",
        chainId: CHAIN_ID,
        verifyingContract: VAULT_ADDRESS
    };

    // 3. Define Types (must match contract exactly)
    const types = {
        Payout: [
            { name: "roomId", type: "bytes32" },
            { name: "winner", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" }
        ]
    };

    // 4. Value data
    const value = {
        roomId: roomId,
        winner: winnerAddress,
        amount: BigInt(amountInWei),
        nonce: BigInt(nonce),
        deadline: deadline
    };

    // 5. Sign the data
    try {
        const signature = await wallet.signTypedData(domain, types, value);

        console.log(`✅ Signature generated for Room: ${roomId}`);
        console.log(`🏆 Winner: ${winnerAddress}`);

        return {
            roomId,
            winner: winnerAddress,
            amount: amountInWei,
            nonce: value.nonce.toString(),
            deadline: deadline,
            signature
        };
    } catch (error) {
        console.error("❌ EIP-712 Signing failed:", error);
        throw error;
    }
}

export const walletAddress = wallet ? wallet.address : null;

// --- DEMO / TEST MODE ---
// Checks if file is run directly (ESM equivalent)
if (process.argv[1] === __filename) {
    const testRoomId = ethers.id("test_room_123");
    const testWinner = "0x0000000000000000000000000000000000000000";
    const testAmount = ethers.parseEther("200").toString();

    if (wallet) {
        signPayout(testRoomId, testWinner, testAmount)
            .then(res => console.log("Test Result:", JSON.stringify(res, null, 2)))
            .catch(console.error);
    } else {
        console.log("No wallet configured, skipping test.");
    }
}
