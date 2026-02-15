/**
 * GameStateManager — Redis-backed game state persistence
 *
 * Singleton. All room CRUD goes through here.
 * Checkpoint system saves snapshots every N turns for crash recovery.
 */

import { redis } from '../db/redisClient.js';
import { createHash } from 'crypto';

// ============================================
// TYPES (Backend-only, independent of frontend)
// ============================================

export interface RoomPlayer {
    address: string;
    name: string;
    color: string;
    socketId?: string;
    connected?: boolean;
}

export interface BackendRoom {
    id: string;
    mode: 'classic' | 'rapid';
    status: 'WAITING' | 'READY' | 'COUNTDOWN' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
    creator: string;
    betAmount: string;
    players: Record<number, RoomPlayer>;
    gameState: any | null;
    createdAt: number;
    lastUpdated?: number;
}

interface Checkpoint {
    timestamp: number;
    turnNumber: number;
    state: any;
    hash: string;
    mode: string;
}

// ============================================
// REDIS KEY PREFIXES
// ============================================

const ROOM_PREFIX = 'goludo:room:';
const CHECKPOINT_PREFIX = 'goludo:checkpoint:';
const ACTIVE_ROOMS_SET = 'goludo:active_rooms';
const ROOM_TTL = 60 * 60 * 24; // 24 hours

// ============================================
// GAME STATE MANAGER
// ============================================

export class GameStateManager {
    private static instance: GameStateManager;

    static getInstance(): GameStateManager {
        if (!GameStateManager.instance) {
            GameStateManager.instance = new GameStateManager();
        }
        return GameStateManager.instance;
    }

    async saveRoom(room: BackendRoom): Promise<void> {
        const key = `${ROOM_PREFIX}${room.id}`;
        const data = JSON.stringify({ ...room, lastUpdated: Date.now() });

        await Promise.all([
            redis.setex(key, ROOM_TTL, data),
            redis.sadd(ACTIVE_ROOMS_SET, room.id),
        ]);
    }

    async getRoom(roomId: string): Promise<BackendRoom | null> {
        const key = `${ROOM_PREFIX}${roomId}`;
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    }

    async getAllActiveRooms(): Promise<BackendRoom[]> {
        const roomIds = await redis.smembers(ACTIVE_ROOMS_SET);
        if (roomIds.length === 0) return [];

        const keys = roomIds.map(id => `${ROOM_PREFIX}${id}`);
        const rooms = await redis.mget(keys);

        return rooms
            .filter((r): r is string => r !== null)
            .map(r => JSON.parse(r));
    }

    async deleteRoom(roomId: string): Promise<void> {
        await Promise.all([
            redis.del(`${ROOM_PREFIX}${roomId}`),
            redis.srem(ACTIVE_ROOMS_SET, roomId),
            redis.del(`${CHECKPOINT_PREFIX}${roomId}`),
        ]);
    }

    // ============================================
    // CHECKPOINT SYSTEM
    // ============================================

    async saveCheckpoint(roomId: string, gameState: any): Promise<void> {
        const checkpoint: Checkpoint = {
            timestamp: Date.now(),
            turnNumber: gameState.currentTurn ?? 0,
            state: gameState,
            hash: this.calculateStateHash(gameState),
            mode: gameState.mode ?? 'classic',
        };

        await redis.lpush(
            `${CHECKPOINT_PREFIX}${roomId}`,
            JSON.stringify(checkpoint)
        );

        // Keep only last 10 checkpoints
        await redis.ltrim(`${CHECKPOINT_PREFIX}${roomId}`, 0, 9);
    }

    async getLatestCheckpoint(roomId: string): Promise<Checkpoint | null> {
        const data = await redis.lindex(`${CHECKPOINT_PREFIX}${roomId}`, 0);
        return data ? JSON.parse(data) : null;
    }

    // ============================================
    // RECOVERY ON SERVER RESTART
    // ============================================

    async recoverState(): Promise<BackendRoom[]> {
        console.log('🔄 Recovering game state from Redis...');

        const rooms = await this.getAllActiveRooms();
        console.log(`📦 Found ${rooms.length} active rooms`);

        const activeRooms: BackendRoom[] = [];

        for (const room of rooms) {
            const hoursSinceUpdate = (Date.now() - (room.lastUpdated ?? 0)) / (1000 * 60 * 60);

            if (hoursSinceUpdate > 24) {
                console.log(`🗑️ Removing stale room ${room.id}`);
                await this.deleteRoom(room.id);
                continue;
            }

            if (room.status === 'ACTIVE' || room.status === 'WAITING' || room.status === 'READY') {
                console.log(`✅ Room ${room.id} (${room.mode}) recovered — status: ${room.status}`);
                activeRooms.push(room);
            }
        }

        return activeRooms;
    }

    // ============================================
    // HEALTH CHECK
    // ============================================

    async healthCheck(): Promise<{ connected: boolean; activeRooms: number; latency: number }> {
        const start = Date.now();

        try {
            await redis.ping();
            const roomCount = await redis.scard(ACTIVE_ROOMS_SET);
            return { connected: true, activeRooms: roomCount, latency: Date.now() - start };
        } catch {
            return { connected: false, activeRooms: 0, latency: -1 };
        }
    }

    // ============================================
    // INTERNAL
    // ============================================

    private calculateStateHash(state: any): string {
        const stableData = {
            mode: state.mode,
            activePlayer: state.activePlayer,
            tokens: state.tokens,
            winner: state.winner,
        };
        return createHash('sha256').update(JSON.stringify(stableData)).digest('hex');
    }
}
