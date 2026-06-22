import { z } from 'zod';
import { ethers } from 'ethers';

/**
 * Common regex patterns for Web3 validation
 */
const HEX_64_REGEX = /^0x[a-fA-F0-9]{64}$/;

/**
 * Custom Zod validator for Ethereum addresses
 */
const EthAddress = z.string().refine((val) => ethers.isAddress(val), {
    message: "Invalid Ethereum address",
});

/**
 * Custom Zod validator for Bytes32 hex strings
 */
const Bytes32 = z.string().regex(HEX_64_REGEX, {
    message: "Invalid Bytes32 hex string (must be 66 chars starting with 0x)",
});

/**
 * Room Creation Schema
 *
 * txHash is required whenever stake > 0 (i.e., a staked game).
 * Free-play / zero-stake rooms may omit it for legacy support.
 */
export const createRoomSchema = z.object({
    roomId: Bytes32,
    txHash: Bytes32.optional(),
    stake: z.union([z.number(), z.string()]).transform((val) => val.toString()),
    maxPlayers: z.union([z.number(), z.string()]).transform((val) => parseInt(val.toString())),
    creatorName: z.string().min(1).max(32).trim(),
    creatorAddress: EthAddress,
    color: z.enum(['red', 'green', 'yellow', 'blue']).default('red'),
    mode: z.enum(['classic', 'rapid']).default('classic'), // V2: Game mode
}).refine(
    (data) => {
        const stakeValue = parseFloat(data.stake);
        // Require txHash for staked (non-zero) rooms
        if (stakeValue > 0 && !data.txHash) return false;
        return true;
    },
    { message: "txHash is required for staked rooms", path: ["txHash"] }
);

/**
 * Payout Signing Schema
 */
export const payoutSignSchema = z.object({
    roomId: Bytes32,
    winner: EthAddress,
});

/**
 * Room Join Schema
 *
 * txHash is optional at the schema level (join requests don't carry the stake
 * amount, so the schema cannot distinguish staked from free-play).  The server
 * enforces txHash at runtime when blockchain verification is enabled, and emits
 * a warning in legacy/dev mode when it is absent.
 */
export const joinRoomSchema = z.object({
    roomId: Bytes32,
    txHash: Bytes32.optional(), // Enforced at runtime by the server for staked rooms
    playerName: z.string().min(1).max(32).trim(),
    playerAddress: EthAddress,
    color: z.enum(['red', 'green', 'yellow', 'blue']).default('blue'),
});

/**
 * Validation Middleware
 * 
 * @param {z.ZodSchema} schema 
 */
export const validateRequest = (schema) => (req, res, next) => {
    try {
        const validated = schema.parse(req.body);
        req.body = validated; // Replaced with sanitized/transformed version
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Validation failed",
                details: error.errors.map(e => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            });
        }
        next(error);
    }
};
