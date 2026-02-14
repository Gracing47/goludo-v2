/**
 * Profile & Leaderboard API Routes
 */

import express from 'express';
import { ProfileManager } from '../services/profileManager.js';

const router = express.Router();
const profileManager = ProfileManager.getInstance();

const VALID_METRICS = ['totalWins', 'classicWins', 'rapidWins', 'totalWon'] as const;
type LeaderboardMetric = typeof VALID_METRICS[number];

// GET /api/profile/:address
router.get('/profile/:address', async (req, res) => {
    try {
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
