/**
 * Profile & Leaderboard API Routes
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { ProfileManager } from '../services/profileManager.js';

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

export default router;
