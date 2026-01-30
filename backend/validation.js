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
 */
export const createRoomSchema = z.object({
    roomId: Bytes32,
    txHash: Bytes32.optional(), // Optional for legacy support, but enforced if present
    stake: z.union([z.number(), z.string()]).transform((val) => val.toString()),
    maxPlayers: z.union([z.number(), z.string()]).transform((val) => parseInt(val.toString())),
    creatorName: z.string().min(1).max(32).trim(),
    creatorAddress: EthAddress,
    color: z.enum(['red', 'green', 'yellow', 'blue']).default('red'),
});

/**
 * Payout Signing Schema
 */
export const payoutSignSchema = z.object({
    roomId: Bytes32,
    winner: EthAddress,
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
