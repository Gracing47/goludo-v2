/**
 * Health Check Route — Always returns 200 so Railway doesn't kill the container.
 * Redis + DB status reported in body for monitoring.
 */

import express from 'express';
import { GameStateManager } from '../services/stateManager.js';

const router = express.Router();

// GET /health — ALWAYS 200 so Railway healthcheck passes
router.get('/health', async (_req, res) => {
    const result: any = {
        status: 'ok',
        timestamp: Date.now(),
        redis: { connected: false, activeRooms: 0, latency: -1 },
        database: { connected: false },
    };

    // Redis check (non-blocking)
    try {
        const stateManager = GameStateManager.getInstance();
        result.redis = await stateManager.healthCheck();
    } catch {
        // Redis not available — that's fine
    }

    // DB check (non-blocking) — lazy import to avoid crash if prisma not configured
    try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.$queryRaw`SELECT 1`;
        result.database.connected = true;
        await prisma.$disconnect();
    } catch {
        // DB not available — that's fine
    }

    // Always 200
    res.status(200).json(result);
});

export default router;
