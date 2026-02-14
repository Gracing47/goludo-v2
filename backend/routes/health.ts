/**
 * Health Check Route — Redis + DB status
 */

import express from 'express';
import { GameStateManager } from '../services/stateManager.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const stateManager = GameStateManager.getInstance();
const prisma = new PrismaClient();

// GET /health
router.get('/health', async (_req, res) => {
    try {
        const redisHealth = await stateManager.healthCheck();

        let dbConnected = false;
        try {
            await prisma.$queryRaw`SELECT 1`;
            dbConnected = true;
        } catch {
            dbConnected = false;
        }

        const healthy = redisHealth.connected && dbConnected;

        res.status(healthy ? 200 : 503).json({
            status: healthy ? 'healthy' : 'degraded',
            timestamp: Date.now(),
            redis: redisHealth,
            database: { connected: dbConnected },
        });
    } catch (error: any) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
});

export default router;
