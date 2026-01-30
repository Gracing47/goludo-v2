/**
 * ROOM LIFECYCLE MANAGER
 * Handles room cleanup, timer management, and memory leak prevention
 * for production-scale deployment (100-1000+ concurrent matches)
 */

// Store all active intervals/timeouts per room for cleanup
export const roomTimers = new Map(); // roomId -> { turnTimer, countdownInterval, socketWaitInterval }

/**
 * Register a timer for a room
 */
export function registerRoomTimer(roomId, timerType, timerId) {
    if (!roomTimers.has(roomId)) {
        roomTimers.set(roomId, {});
    }
    const timers = roomTimers.get(roomId);

    // Clear old timer of same type if exists
    if (timers[timerType]) {
        if (timerType.includes('Interval')) {
            clearInterval(timers[timerType]);
        } else {
            clearTimeout(timers[timerType]);
        }
    }

    timers[timerType] = timerId;
}

/**
 * Clear all timers for a room
 */
export function clearAllRoomTimers(roomId) {
    const timers = roomTimers.get(roomId);
    if (!timers) return;

    Object.entries(timers).forEach(([type, id]) => {
        if (type.includes('Interval')) {
            clearInterval(id);
        } else {
            clearTimeout(id);
        }
    });

    roomTimers.delete(roomId);
    console.log(`🧹 Cleared all timers for room ${roomId}`);
}

/**
 * Clear a specific timer for a room
 */
export function clearSpecificTimer(roomId, timerType) {
    const timers = roomTimers.get(roomId);
    if (timers && timers[timerType]) {
        if (timerType.includes('Interval')) {
            clearInterval(timers[timerType]);
        } else {
            clearTimeout(timers[timerType]);
        }
        delete timers[timerType];
        console.log(`⏹️ Cleared ${timerType} for room ${roomId}`);
    }
}

/**
 * Check if a room should be cleaned up
 * Returns true if room is inactive and should be removed
 */
export function shouldCleanupRoom(room) {
    // Room finished and all players disconnected
    if (room.gameState?.gamePhase === 'WIN') {
        const anyConnected = room.players.some(p => p && p.socketId);
        if (!anyConnected) {
            console.log(`🗑️ Room ${room.id} - Game finished, all players gone`);
            return true;
        }
    }

    // Room in WAITING state for more than 5 minutes
    if (room.status === 'WAITING' && room.createdAt) {
        const ageMinutes = (Date.now() - room.createdAt) / 1000 / 60;
        if (ageMinutes > 5) {
            console.log(`🗑️ Room ${room.id} - Waiting too long (${ageMinutes.toFixed(1)}m)`);
            return true;
        }
    }

    // Room cancelled
    if (room.status === 'CANCELLED') {
        console.log(`🗑️ Room ${room.id} - Cancelled`);
        return true;
    }

    // Active game but all players disconnected for 2+ minutes
    if (room.status === 'ACTIVE') {
        const anyConnected = room.players.some(p => p && p.socketId);
        if (!anyConnected) {
            if (!room._allDisconnectedAt) {
                room._allDisconnectedAt = Date.now();
            } else {
                const disconnectedMinutes = (Date.now() - room._allDisconnectedAt) / 1000 / 60;
                if (disconnectedMinutes > 2) {
                    console.log(`🗑️ Room ${room.id} - All players gone for ${disconnectedMinutes.toFixed(1)}m`);
                    return true;
                }
            }
        } else {
            // Reset timer if someone reconnected
            delete room._allDisconnectedAt;
        }
    }

    return false;
}

/**
 * Cleanup a single room
 */
export function cleanupRoom(roomId, activeRooms) {
    clearAllRoomTimers(roomId);
    const index = activeRooms.findIndex(r => r.id === roomId);
    if (index !== -1) {
        activeRooms.splice(index, 1);
        console.log(`✅ Room ${roomId} cleaned up. Active rooms: ${activeRooms.length}`);
    }
}

/**
 * Periodic cleanup job - runs every 60 seconds
 * Removes stale/finished rooms to prevent memory leaks
 */
export function startCleanupJob(activeRooms) {
    setInterval(() => {
        const before = activeRooms.length;
        const toRemove = [];

        activeRooms.forEach(room => {
            if (shouldCleanupRoom(room)) {
                toRemove.push(room.id);
            }
        });

        toRemove.forEach(roomId => cleanupRoom(roomId, activeRooms));

        if (toRemove.length > 0) {
            console.log(`🧹 Cleanup: Removed ${toRemove.length} rooms (${before} → ${activeRooms.length})`);
        }
    }, 60000); // Run every 60 seconds
}
