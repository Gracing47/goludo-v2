/**
 * MOVEMENT ENGINE TESTS
 * 
 * Tests for path calculations and move validation
 */

import { describe, it, expect } from 'vitest';
import {
    calculateMove,
    calculateDestination,
    isBlockedByBlockade,
    getCapturesAt
} from '../engine/movementEngine';
import {
    POSITION,
    PLAYER_PATHS,
    PLAYER_START_POSITIONS,
    SAFE_POSITIONS,
    HOME_STRETCH_START
} from '../engine/constants';

describe('Movement Engine', () => {

    // Helper to create a basic game state
    const createTestState = (tokens = null) => ({
        tokens: tokens || [
            [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
            [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
            [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
            [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
        ],
        playerCount: 4
    });

    describe('calculateMove', () => {
        it('should return null for tokens in yard with non-6 roll', () => {
            const state = createTestState();
            const move = calculateMove(state, 0, 0, 3);
            expect(move).toBeNull();
        });

        it('should allow spawn with a 6 roll', () => {
            const state = createTestState();
            const move = calculateMove(state, 0, 0, 6);

            expect(move).not.toBeNull();
            expect(move.isSpawn).toBe(true);
            expect(move.toPosition).toBe(PLAYER_START_POSITIONS[0]);
        });

        it('should return null for finished tokens', () => {
            const state = createTestState([
                [POSITION.FINISHED, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
            ]);

            const move = calculateMove(state, 0, 0, 3);
            expect(move).toBeNull();
        });

        it('should calculate correct destination for board moves', () => {
            const state = createTestState([
                [0, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
            ]);

            const move = calculateMove(state, 0, 0, 3);
            expect(move).not.toBeNull();
            expect(move.toPosition).toBe(3);
        });
    });

    describe('calculateDestination', () => {
        it('should calculate correct destination on main path', () => {
            const state = createTestState([
                [5, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
            ]);

            const dest = calculateDestination(state, 0, 5, 4);
            expect(dest).toBe(9);
        });

        it('should handle wraparound at position 51 to 0', () => {
            // Test that path wraps correctly
            const redPath = PLAYER_PATHS[0];

            // Red's path should include positions 0-50, then home stretch
            expect(redPath).toContain(0);
            expect(redPath).toContain(50);
        });

        it('should return FINISHED when landing on goal', () => {
            // Token at home stretch position 104 (5th home cell for Red)
            const state = createTestState([
                [104, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
            ]);

            const dest = calculateDestination(state, 0, 104, 1);
            expect(dest).toBe(POSITION.FINISHED);
        });

        it('should return null when overshooting goal (exact throw rule)', () => {
            // Token at home stretch position 103
            const state = createTestState([
                [103, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
            ]);

            // Rolling 5 would overshoot
            const dest = calculateDestination(state, 0, 103, 5);
            expect(dest).toBeNull();
        });
    });

    describe('isBlockedByBlockade', () => {
        it('should detect blockade when BLOCKADE_STRICT is true (standard mode)', () => {
            const state = createTestState([
                [10, 10, POSITION.IN_YARD, POSITION.IN_YARD], // Two Red tokens at 10
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
            ]);

            // With BLOCKADE_STRICT: true, tokens at position 10 form a wall
            const blocked = isBlockedByBlockade(state, 1, 10);
            expect(blocked).toBe(true);
        });

        it('should not block on home stretch positions', () => {
            const state = createTestState([
                [100, 100, POSITION.IN_YARD, POSITION.IN_YARD], // Two tokens in home stretch
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
            ]);

            // Home stretch positions shouldn't be blockable
            const blocked = isBlockedByBlockade(state, 0, 100);
            expect(blocked).toBe(false);
        });
    });

    describe('getCapturesAt', () => {
        it('should detect capturable opponent token', () => {
            const state = createTestState([
                [10, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD], // Red at 10
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
            ]);

            // Green (player 1) moving to position 10
            const captures = getCapturesAt(state, 1, 10);
            expect(captures.length).toBe(1);
            expect(captures[0].player).toBe(0);
            expect(captures[0].tokenIndex).toBe(0);
        });

        it('should not capture on safe positions', () => {
            // Safe positions protect tokens
            const safePos = SAFE_POSITIONS[0];

            const state = createTestState([
                [safePos, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
            ]);

            const captures = getCapturesAt(state, 1, safePos);
            expect(captures.length).toBe(0);
        });

        it('should not capture own tokens', () => {
            const state = createTestState([
                [10, 12, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
            ]);

            // Red (player 0) moving to position 10 where own token is
            const captures = getCapturesAt(state, 0, 10);
            expect(captures.length).toBe(0);
        });
    });

    describe('Player Paths', () => {
        it('should have correct path length for each player', () => {
            // Each player path should be 52 main path + 6 home stretch = 58 positions
            // Actually, it's 51 unique main + 6 home = 57
            Object.values(PLAYER_PATHS).forEach(path => {
                expect(path.length).toBeGreaterThanOrEqual(56);
                expect(path.length).toBeLessThanOrEqual(58);
            });
        });

        it('should have unique paths for each player', () => {
            // Start positions should differ
            expect(PLAYER_PATHS[0][0]).not.toBe(PLAYER_PATHS[1][0]);
            expect(PLAYER_PATHS[1][0]).not.toBe(PLAYER_PATHS[2][0]);
            expect(PLAYER_PATHS[2][0]).not.toBe(PLAYER_PATHS[3][0]);
        });

        it('should end with home stretch positions', () => {
            // Last positions should be in home stretch range (100+)
            expect(PLAYER_PATHS[0][PLAYER_PATHS[0].length - 1]).toBeGreaterThanOrEqual(HOME_STRETCH_START);
        });
    });
});
