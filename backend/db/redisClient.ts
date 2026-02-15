/**
 * Redis Client — Single connection with retry and event logging
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

const isLocal = !process.env.REDIS_URL && !process.env.REDIS_PRIVATE_URL && REDIS_HOST === 'localhost';

function createRedisClient(): Redis {
    const config: any = {
        maxRetriesPerRequest: isLocal ? 1 : 3, // Minimal retries locally
        retryStrategy: (times: number) => {
            if (isLocal && times > 1) return null; // Stop retrying on localhost
            return Math.min(times * 50, 2000);
        },
    };

    if (REDIS_URL) {
        return new Redis(REDIS_URL, config);
    }

    return new Redis({
        ...config,
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD || undefined,
    });
}

const redis = createRedisClient();

let hasLoggedError = false;
redis.on('error', (err) => {
    if (isLocal) {
        if (!hasLoggedError) {
            console.warn('⚠️ Local Redis not detected at localhost:6379. Session persistence will be disabled.');
            hasLoggedError = true;
        }
    } else {
        console.error('❌ Redis error:', err.message);
    }
});
redis.on('connect', () => {
    console.log('✅ Redis connected');
    hasLoggedError = false;
});
redis.on('ready', () => console.log('🟢 Redis ready'));

export { redis };
