/**
 * Admin API (G-027)
 *
 * Ops view + interventions for GoLudo. CEO-friendly by design: everything is
 * reachable with one access code, no wallet needed on the client.
 *
 * SECURITY MODEL (testnet):
 * - Fail-closed: every route 503s until ADMIN_KEY is set in the server env.
 * - Auth via `X-Admin-Key` header, compared timing-safe.
 * - Owner contract calls (faucet toggle/refill, vault pause) are signed
 *   SERVER-SIDE with SERVER_SIGNER_PRIVATE_KEY (= contract owner/deployer).
 *   Deliberate deviation from the original "admin wallet" idea so a
 *   non-technical operator can act — acceptable on testnet, revisit for
 *   mainnet (G-016 gate). Every action is console-logged for audit.
 */
import express from 'express';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { ProfileManager } from '../services/profileManager.js';
import { getBurnMetrics } from '../services/burnMetrics.js';

const router = express.Router();
const profileManager = ProfileManager.getInstance();

// Minimal embedded ABIs (same pattern as contractVerifier — no fs dependency)
const GOTOKEN_ABI = [
    'function faucetEnabled() view returns (bool)',
    'function faucetReservoir() view returns (uint256)',
    'function toggleFaucet()',
    'function refillFaucet(uint256 amount)',
    'function balanceOf(address) view returns (uint256)',
    'function owner() view returns (address)',
];
const VAULT_ABI = [
    'function paused() view returns (bool)',
    'function pause()',
    'function unpause()',
];

const RPC_URL = process.env.FLARE_RPC_URL;
const GOTOKEN_ADDRESS = process.env.GOTOKEN_ADDRESS;
const VAULT_ADDRESS = process.env.LUDOVAULT_ADDRESS || process.env.VITE_LUDOVAULT_ADDRESS;

function getProvider() {
    if (!RPC_URL) throw new Error('FLARE_RPC_URL not configured');
    return new ethers.JsonRpcProvider(RPC_URL);
}

function getOwnerWallet() {
    const key = process.env.SERVER_SIGNER_PRIVATE_KEY;
    if (!key) throw new Error('SERVER_SIGNER_PRIVATE_KEY not configured');
    return new ethers.Wallet(key, getProvider());
}

// ---- Auth: fail-closed, timing-safe ----
router.use((req, res, next) => {
    const configured = process.env.ADMIN_KEY;
    if (!configured) {
        return res.status(503).json({ error: 'Admin panel disabled — set ADMIN_KEY in the server environment.' });
    }
    const given = String(req.header('x-admin-key') || '');
    const a = crypto.createHash('sha256').update(given).digest();
    const b = crypto.createHash('sha256').update(configured).digest();
    if (!crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'Wrong access code' });
    }
    next();
});

// ---- READ: everything at a glance ----
router.get('/overview', async (req, res) => {
    const out: any = { ok: true, now: Date.now() };

    // Lobby rooms (full detail — this is the admin view)
    const activeRooms = (req.app.locals.activeRooms as any[]) || [];
    out.rooms = activeRooms.map(r => ({
        id: r.id,
        status: r.status,
        stake: r.stake,
        mode: r.mode ?? r.gameState?.mode ?? 'classic',
        maxPlayers: r.maxPlayers,
        creator: r.creator ?? null,
        createdAt: r.createdAt,
        ageMinutes: Math.floor((Date.now() - (r.createdAt || Date.now())) / 60000),
        gamePhase: r.gameState?.gamePhase ?? null,
        players: (r.players || []).filter(Boolean).map((p: any) => ({
            name: p.name, address: p.address, color: p.color, connected: !!p.socketId, forfeited: !!p.forfeited,
        })),
    }));

    // On-chain: faucet + vault state (best-effort, never breaks the overview)
    try {
        const provider = getProvider();
        if (GOTOKEN_ADDRESS) {
            const token = new ethers.Contract(GOTOKEN_ADDRESS, GOTOKEN_ABI, provider);
            out.faucet = {
                enabled: await token.faucetEnabled(),
                reservoir: (await token.faucetReservoir()).toString(),
            };
        }
        if (VAULT_ADDRESS) {
            const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
            out.vault = { address: VAULT_ADDRESS, paused: await vault.paused() };
        }
    } catch (err: any) {
        out.chainError = `On-chain reads failed: ${err.message?.slice(0, 120)}`;
    }

    // Burn metrics (reuses the public service)
    try { out.burn = await getBurnMetrics(); } catch { out.burn = { available: false }; }

    res.json(out);
});

router.get('/players', async (req, res) => {
    try {
        const metric = (['totalWins', 'classicWins', 'rapidWins', 'totalWon', 'totalXp'].includes(String(req.query.metric))
            ? String(req.query.metric) : 'totalXp') as any;
        const limit = Math.min(parseInt(String(req.query.limit)) || 50, 100);
        const players = await profileManager.getLeaderboard(metric, limit);
        res.json(players);
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

// ---- WRITE: lobby interventions (no chain effect, stakes untouched) ----
router.post('/rooms/remove', (req, res) => {
    const { roomId } = req.body || {};
    const ops = req.app.locals.adminOps;
    if (!ops?.removeRoom) return res.status(500).json({ error: 'Admin ops not wired' });
    if (typeof roomId !== 'string') return res.status(400).json({ error: 'Invalid roomId' });
    const removed = ops.removeRoom(roomId);
    console.log(`🛡️ [ADMIN] room remove ${roomId} → ${removed}`);
    return res.json({ ok: true, removed, note: 'Lobby entry removed. On-chain stakes are NOT touched — use Cancel/Refund in the game for that.' });
});

// ---- WRITE: owner contract actions (server-signed, audit-logged) ----
async function ownerTx(res: express.Response, label: string, fn: (w: ethers.Wallet) => Promise<any>) {
    try {
        const wallet = getOwnerWallet();
        const tx = await fn(wallet);
        const receipt = await tx.wait();
        console.log(`🛡️ [ADMIN] ${label} → ${receipt.hash} (block ${receipt.blockNumber})`);
        return res.json({ ok: true, txHash: receipt.hash });
    } catch (err: any) {
        const msg = (err.reason || err.shortMessage || err.message || 'unknown').slice(0, 160);
        console.error(`🛡️ [ADMIN] ${label} FAILED: ${msg}`);
        return res.status(502).json({ error: `${label} failed: ${msg}` });
    }
}

router.post('/faucet/toggle', (req, res) => {
    if (!GOTOKEN_ADDRESS) return res.status(500).json({ error: 'GOTOKEN_ADDRESS not configured' });
    return ownerTx(res, 'faucet toggle', (w) =>
        new ethers.Contract(GOTOKEN_ADDRESS, GOTOKEN_ABI, w).toggleFaucet());
});

router.post('/faucet/refill', (req, res) => {
    if (!GOTOKEN_ADDRESS) return res.status(500).json({ error: 'GOTOKEN_ADDRESS not configured' });
    const amount = String(req.body?.amount || '');
    if (!/^\d+(\.\d+)?$/.test(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number of $GO' });
    }
    return ownerTx(res, `faucet refill ${amount} GO`, (w) =>
        new ethers.Contract(GOTOKEN_ADDRESS, GOTOKEN_ABI, w).refillFaucet(ethers.parseEther(amount)));
});

router.post('/vault/pause', (req, res) => {
    if (!VAULT_ADDRESS) return res.status(500).json({ error: 'Vault address not configured' });
    return ownerTx(res, 'VAULT PAUSE', (w) =>
        new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, w).pause());
});

router.post('/vault/unpause', (req, res) => {
    if (!VAULT_ADDRESS) return res.status(500).json({ error: 'Vault address not configured' });
    return ownerTx(res, 'vault unpause', (w) =>
        new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, w).unpause());
});

export default router;
