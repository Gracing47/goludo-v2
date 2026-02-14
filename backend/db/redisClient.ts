/**
 * Redis Client — Single connection with retry and event logging
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

function createRedisClient(): Redis {
    if (REDIS_URL) {
        return new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => Math.min(times * 50, 2000),
        });
    }

    return new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
    });
}

const redis = createRedisClient();

redis.on('error', (err) => console.error('❌ Redis error:', err.message));
redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('ready', () => console.log('🟢 Redis ready'));

export { redis };
