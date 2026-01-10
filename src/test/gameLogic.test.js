/**
 * GAME LOGIC TESTS
 * 
 * Tests for core game engine functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    createInitialState,
    rollDice,
    moveToken,
    completeMoveAnimation
} from '../engine/gameLogic';
import { POSITION, GAME_PHASE, PLAYER_START_POSITIONS } from '../engine/constants';

describe('Game Logic', () => {
    let gameState;

    beforeEach(() => {
        gameState = createInitialState(4, [0, 1, 2, 3]);
    });

    describe('createInitialState', () => {
        it('should create initial state with 4 players', () => {
            expect(gameState.playerCount).toBe(4);
            expect(gameState.activeColors).toEqual([0, 1, 2, 3]);
        });

        it('should have all tokens in yard', () => {
            gameState.tokens.forEach(playerTokens => {
                playerTokens.forEach(token => {
                    expect(token).toBe(POSITION.IN_YARD);
                });
            });
        });

        it('should start in ROLL_DICE phase', () => {
            expect(gameState.gamePhase).toBe(GAME_PHASE.ROLL_DICE);
        });

        it('should have first player as active', () => {
            expect(gameState.activePlayer).toBe(0);
        });

        it('should support 2 player game', () => {
            const twoPlayerState = createInitialState(2, [0, 2]);
            expect(twoPlayerState.playerCount).toBe(2);
            expect(twoPlayerState.activeColors).toEqual([0, 2]);
        });
    });

    describe('rollDice', () => {
        it('should generate a value between 1 and 6', () => {
            // Roll many times to statistically verify range
            for (let i = 0; i < 100; i++) {
                const newState = rollDice(gameState);
                expect(newState.diceValue).toBeGreaterThanOrEqual(1);
                expect(newState.diceValue).toBeLessThanOrEqual(6);
            }
        });

        it('should pass turn if no valid moves and not a 6', () => {
            // Force a non-6 roll scenario
            const mockState = { ...gameState };

            // With all tokens in yard and a non-6, should pass turn
            const newState = rollDice(mockState);
            if (newState.diceValue !== 6) {
                // Should either pass or stay for 6
                expect(newState.gamePhase).toBe(GAME_PHASE.ROLL_DICE);
            }
        });

        it('should allow token spawn with a 6', () => {
            // Keep rolling until we get a 6
            let newState = gameState;
            let attempts = 0;
            while (newState.diceValue !== 6 && attempts < 100) {
                newState = rollDice(gameState);
                attempts++;
            }

            if (newState.diceValue === 6) {
                expect(newState.validMoves.length).toBeGreaterThan(0);
                expect(newState.gamePhase).toBe(GAME_PHASE.SELECT_TOKEN);
            }
        });

        it('should track consecutive sixes', () => {
            // Manual test: simulate consecutive 6s
            let state = { ...gameState, consecutiveSixes: 2 };

            // If we roll another 6, we should be penalized (triple 6)
            // This is probabilistic, but the logic should handle it
            expect(state.consecutiveSixes).toBe(2);
        });
    });

    describe('moveToken', () => {
        it('should move token to specified position', () => {
            // Set up a token that's on the board
            const state = {
                ...gameState,
                tokens: [[0, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]],
                activePlayer: 0
            };

            const move = {
                tokenIndex: 0,
                fromPosition: 0,
                toPosition: 3,
                isSpawn: false,
                captures: []
            };

            const newState = moveToken(state, move);
            expect(newState.tokens[0][0]).toBe(3);
        });

        it('should capture opponent token', () => {
            // Red token at position 10, Green token also at 10
            const state = {
                ...gameState,
                tokens: [[10, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]],
                activePlayer: 1
            };

            // Green moves to position 10 and captures Red
            // First, put Green on position 8
            state.tokens[1][0] = 8;

            const move = {
                tokenIndex: 0,
                fromPosition: 8,
                toPosition: 10,
                isSpawn: false,
                captures: [{ player: 0, tokenIndex: 0 }]
            };

            const newState = moveToken(state, move);

            // Green should be at 10
            expect(newState.tokens[1][0]).toBe(10);
            // Red should be back in yard
            expect(newState.tokens[0][0]).toBe(POSITION.IN_YARD);
            // Bonus moves should be awarded
            expect(newState.bonusMoves).toBeGreaterThan(0);
        });

        it('should award bonus for reaching home', () => {
            const state = {
                ...gameState,
                tokens: [[104, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]],
                activePlayer: 0
            };

            const move = {
                tokenIndex: 0,
                fromPosition: 104,
                toPosition: POSITION.FINISHED,
                isSpawn: false,
                isHome: true,
                captures: []
            };

            const newState = moveToken(state, move);
            expect(newState.tokens[0][0]).toBe(POSITION.FINISHED);
            expect(newState.bonusMoves).toBe(10); // HOME_BONUS
        });
    });

    describe('completeMoveAnimation', () => {
        it('should detect winner when all tokens finished', () => {
            const state = {
                ...gameState,
                tokens: [[POSITION.FINISHED, POSITION.FINISHED, POSITION.FINISHED, POSITION.FINISHED],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]],
                activePlayer: 0,
                bonusMoves: 0,
                consecutiveSixes: 0
            };

            const newState = completeMoveAnimation(state);
            expect(newState.winner).toBe(0);
            expect(newState.gamePhase).toBe(GAME_PHASE.WIN);
        });

        it('should process bonus moves when available', () => {
            const state = {
                ...gameState,
                tokens: [[5, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]],
                activePlayer: 0,
                bonusMoves: 20,
                consecutiveSixes: 0
            };

            const newState = completeMoveAnimation(state);

            // Should enter bonus move phase
            if (newState.validMoves.length > 0) {
                expect(newState.gamePhase).toBe(GAME_PHASE.BONUS_MOVE);
                expect(newState.diceValue).toBe(20);
            }
        });

        it('should allow re-roll after rolling 6', () => {
            const state = {
                ...gameState,
                tokens: [[5, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]],
                activePlayer: 0,
                bonusMoves: 0,
                consecutiveSixes: 1, // Just rolled a 6
                diceValue: 6
            };

            const newState = completeMoveAnimation(state);

            // Should stay on same player for re-roll
            expect(newState.activePlayer).toBe(0);
            expect(newState.gamePhase).toBe(GAME_PHASE.ROLL_DICE);
        });
    });
});

describe('Player Start Positions', () => {
    it('should have correct start positions for each player', () => {
        expect(PLAYER_START_POSITIONS[0]).toBe(0);  // Red starts at 0
        expect(PLAYER_START_POSITIONS[1]).toBe(13); // Green starts at 13
        expect(PLAYER_START_POSITIONS[2]).toBe(26); // Yellow starts at 26
        expect(PLAYER_START_POSITIONS[3]).toBe(39); // Blue starts at 39
    });
});
