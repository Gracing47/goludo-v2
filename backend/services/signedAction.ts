/**
 * Signed-action verification (G-032) — replay-safe wallet signatures.
 *
 * The old pattern (`GoLudo username: <name>` → verifyMessage) was replayable:
 * a captured signature stayed valid forever. Harmless for usernames, dangerous
 * for friend accept/remove/block (G-030). This is the ONE utility every
 * mutating user action must go through.
 *
 * Flow: client GET /api/auth/nonce?address=0x… → signs a structured message
 * that embeds action + target + nonce + deadline → server recovers the signer
 * AND consumes the nonce exactly once. A replayed signature fails on the
 * already-consumed nonce.
 *
 * Nonces live in-memory with a short TTL (default 5 min). Single-instance
 * backend, so a Map is sufficient; if the backend ever scales horizontally,
 * move this to Redis (documented in the multichain runbook / G-032 ticket).
 */
import { ethers } from 'ethers';
import crypto from 'crypto';

const NONCE_TTL_MS = 5 * 60 * 1000;

interface NonceEntry { address: string; expires: number; }
const nonces = new Map<string, NonceEntry>();

// lazy sweep of expired nonces (no timer needed)
function sweep() {
    const now = Date.now();
    for (const [k, v] of nonces) if (v.expires < now) nonces.delete(k);
}

/** Issue a fresh single-use nonce bound to an address. */
export function issueNonce(address: string): { nonce: string; deadline: number } {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('Invalid address');
    sweep();
    const nonce = '0x' + crypto.randomBytes(16).toString('hex');
    const deadline = Date.now() + NONCE_TTL_MS;
    nonces.set(nonce, { address: address.toLowerCase(), expires: deadline });
    return { nonce, deadline };
}

/** The exact message the client must sign for a given action. */
export function actionMessage(action: string, target: string, nonce: string, deadline: number): string {
    return `GoLudo ${action}\ntarget: ${target}\nnonce: ${nonce}\nexpires: ${deadline}`;
}

export interface VerifiedAction { signer: string; target: string; }

/**
 * Verify a signed action and CONSUME its nonce (single use).
 * @throws on invalid signature, unknown/expired/replayed nonce, or nonce
 *         issued to a different address than the recovered signer.
 */
export function verifySignedAction(params: {
    action: string; target: string; nonce: string; deadline: number; signature: string;
}): VerifiedAction {
    const { action, target, nonce, deadline, signature } = params;
    if (typeof signature !== 'string' || !signature.startsWith('0x')) throw new Error('Missing signature');

    const entry = nonces.get(nonce);
    if (!entry) throw new Error('Unknown or already-used nonce'); // replay lands here
    nonces.delete(nonce); // consume immediately — even on later failure it's spent
    if (entry.expires < Date.now()) throw new Error('Signature expired');
    if (Number(deadline) !== entry.expires) throw new Error('Deadline mismatch');

    let signer: string;
    try {
        signer = ethers.verifyMessage(actionMessage(action, target, nonce, deadline), signature);
    } catch {
        throw new Error('Invalid signature');
    }
    if (signer.toLowerCase() !== entry.address) throw new Error('Nonce was issued to a different wallet');
    return { signer: signer.toLowerCase(), target };
}
