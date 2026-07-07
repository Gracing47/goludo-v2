/**
 * Profile & Leaderboard API Routes
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { ProfileManager } from '../services/profileManager.js';
import { issueNonce, verifySignedAction } from '../services/signedAction.js';

const router = express.Router();
const profileManager = ProfileManager.getInstance();

// Audit W2: profile reads create DB rows (get-or-create) — validate the
// address shape and rate-limit so nobody floods the table with garbage.
const profileLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many profile requests. Please wait.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// G-023: totalXp exposed — the ProfileManager supported it all along, only this
// route-side allowlist was missing it (leaderboard UI sorts by Season-1 XP).
const VALID_METRICS = ['totalWins', 'classicWins', 'rapidWins', 'totalWon', 'totalXp'] as const;
type LeaderboardMetric = typeof VALID_METRICS[number];

// GET /api/profile/:address
router.get('/profile/:address', profileLimiter, async (req, res) => {
    try {
        if (!/^0x[a-fA-F0-9]{40}$/.test(req.params.address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }
        const stats = await profileManager.getPlayerStats(req.params.address);
        res.json(stats);
    } catch (error: any) {
        console.error('Profile fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// GET /api/leaderboard/:metric
router.get('/leaderboard/:metric', async (req, res) => {
    try {
        const { metric } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);

        if (!VALID_METRICS.includes(metric as LeaderboardMetric)) {
            return res.status(400).json({ error: `Invalid metric. Use: ${VALID_METRICS.join(', ')}` });
        }

        const leaderboard = await profileManager.getLeaderboard(metric as LeaderboardMetric, limit);
        res.json(leaderboard);
    } catch (error: any) {
        console.error('Leaderboard error:', error.message);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// GET /api/auth/nonce?address=0x… — single-use nonce for signed actions (G-032)
router.get('/auth/nonce', profileLimiter, (req, res) => {
    try {
        const address = String(req.query.address || '');
        res.json(issueNonce(address));
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Could not issue nonce' });
    }
});

// POST /api/profile/username — G-028 + G-032: only the wallet OWNER can name
// themselves, and the signature is replay-safe (nonce + deadline). The client
// GETs a nonce, signs the structured `set-username` message, we verify + consume.
router.post('/profile/username', profileLimiter, async (req, res) => {
    try {
        const { username, nonce, deadline, signature } = req.body || {};
        if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
            return res.status(400).json({ error: 'Username must be 3–16 chars: letters, numbers, underscore' });
        }
        let verified;
        try {
            verified = verifySignedAction({ action: 'set-username', target: username, nonce, deadline, signature });
        } catch (e: any) {
            return res.status(400).json({ error: e.message || 'Invalid signature' });
        }
        const result = await profileManager.setUsername(verified.signer, username);
        res.json({ ok: true, ...result });
    } catch (error: any) {
        if (error.code === 'TAKEN') return res.status(409).json({ error: 'Username already taken' });
        console.error('Set username error:', error.message);
        res.status(500).json({ error: 'Failed to set username' });
    }
});

// GET /api/stats — public landing-page numbers, cached 60 s (G-028)
let statsCache: { at: number; data: unknown } | null = null;
router.get('/stats', async (_req, res) => {
    try {
        if (statsCache && Date.now() - statsCache.at < 60_000) return res.json(statsCache.data);
        const stats = {
            ...(await profileManager.getGlobalStats()),
            chainId: parseInt(process.env.CHAIN_ID || '114'), // G-026a: which chain these numbers belong to
        };
        statsCache = { at: Date.now(), data: stats };
        res.json(stats);
    } catch (error: any) {
        console.error('Stats error:', error.message);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;
