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
const CHAIN_ID = parseInt(process.env.CHAIN_ID || "114"); // Default/home chain (Coston2)

/**
 * G-026b: per-chain signer registry. Every chain gets its OWN key + vault:
 *   SERVER_SIGNER_PRIVATE_KEY_<chainId> / VITE_LUDOVAULT_ADDRESS_<chainId>
 * The default chain (CHAIN_ID) falls back to the legacy env names, so a
 * single-chain deployment keeps working with zero env changes.
 */
const chainSigners = new Map();
function getChainSigner(chainId) {
    const id = Number(chainId || CHAIN_ID);
    if (chainSigners.has(id)) return chainSigners.get(id);
    const key = process.env[`SERVER_SIGNER_PRIVATE_KEY_${id}`] || (id === CHAIN_ID ? SIGNER_PRIVATE_KEY : undefined);
    const vault = process.env[`VITE_LUDOVAULT_ADDRESS_${id}`] || (id === CHAIN_ID ? VAULT_ADDRESS : undefined);
    if (!key || !vault) {
        chainSigners.set(id, null);
        return null;
    }
    const entry = { wallet: new ethers.Wallet(key), vaultAddress: vault, chainId: id };
    chainSigners.set(id, entry);
    return entry;
}
/** Chains this instance can sign payouts for (config present). */
export function supportedSignerChainIds() {
    const ids = new Set([CHAIN_ID]);
    for (const k of Object.keys(process.env)) {
        const m = k.match(/^SERVER_SIGNER_PRIVATE_KEY_(\d+)$/);
        if (m) ids.add(Number(m[1]));
    }
    return [...ids].filter(id => getChainSigner(id));
}

/**
 * Contract feeBps — single source of truth for server-side fee math.
 *
 * Must match the value deployed in LudoVault.  Set VAULT_FEE_BPS in .env to
 * mirror the constructor argument (or onchain setFee() calls).  Defaults to
 * 500 (5%) to match legacy behaviour but should be overridden to match the
 * actual deployed contract value.
 *
 * This value is used ONLY for profile-stats accounting (non-blocking, observer
 * pattern).  The authoritative fee calculation always happens on-chain inside
 * claimPayout() which reads its own feeBps storage slot.
 */
export const CONTRACT_FEE_BPS = BigInt(process.env.VAULT_FEE_BPS ?? "500");
export const BPS_DENOMINATOR = 10000n;

if (!SIGNER_PRIVATE_KEY || !VAULT_ADDRESS) {
    console.error("❌ SIGNER_PRIVATE_KEY or LUDOVAULT_ADDRESS missing in .env");
    // process.exit(1); // Don't crash entirely if just testing locally without keys
}

let wallet;
if (SIGNER_PRIVATE_KEY) {
    wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY);
}

/**
 * Generates an EIP-712 signature for a winner payout.
 *
 * PRE-SIGN CROSS-CHECK (AAA-C2):
 *   Before signing, verifies that `amountInWei` (the pot fetched from the
 *   contract) equals `entryAmountInWei * participantCount`.  A mismatch
 *   indicates a data inconsistency between the server room state and the
 *   on-chain pot — in that case we refuse to sign to prevent fund loss.
 *
 * @param {string} roomId The bytes32 ID of the room
 * @param {string} winnerAddress The Ethereum address of the winner
 * @param {string} amountInWei Total pot amount (must equal entryAmount * participants on-chain)
 * @param {string|undefined} entryAmountInWei Per-player entry amount (Wei) — used for cross-check
 * @param {number|undefined} participantCount Number of participants — used for cross-check
 * @returns {Promise<Object>} Object containing the signature and parameters
 */
export async function signPayout(roomId, winnerAddress, amountInWei, entryAmountInWei, participantCount, chainId) {
    // G-026b: resolve the per-chain signer + vault (defaults to the home chain)
    const signerEntry = getChainSigner(chainId);
    if (!signerEntry) throw new Error(`Signer not configured for chain ${chainId || CHAIN_ID}`);
    const signWallet = signerEntry.wallet;

    // AAA-C2: Pre-sign cross-check — pot must equal entryAmount * participants.
    // Only enforced when both optional parameters are supplied.
    if (entryAmountInWei !== undefined && participantCount !== undefined && participantCount > 0) {
        const expectedPot = BigInt(entryAmountInWei) * BigInt(participantCount);
        const actualPot   = BigInt(amountInWei);
        if (expectedPot !== actualPot) {
            throw new Error(
                `Pre-sign pot mismatch: expected ${expectedPot} (entryAmount ${entryAmountInWei} * ${participantCount} players) ` +
                `but on-chain pot is ${actualPot}. Refusing to sign — possible accounting error.`
            );
        }
        console.log(`✅ Pre-sign cross-check passed: pot=${actualPot} = ${entryAmountInWei} * ${participantCount}`);
    }

    // 1. Prepare unique nonce and deadline (24 hours from now)
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours

    // 2. Define EIP-712 Domain — chainId + vault are PER CHAIN (G-026b):
    // a signature for chain A is cryptographically useless on chain B.
    const domain = {
        name: "LudoVault",
        version: "1",
        chainId: signerEntry.chainId,
        verifyingContract: signerEntry.vaultAddress
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
        const signature = await signWallet.signTypedData(domain, types, value);

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
