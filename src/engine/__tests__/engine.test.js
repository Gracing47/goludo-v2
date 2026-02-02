import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, rollDice, moveToken, completeMoveAnimation } from '../gameLogic.js';
import { GAME_PHASE, POSITION, PLAYERS } from '../constants.js';

describe('GoLudo Engine', () => {
    let initialState;

    beforeEach(() => {
        initialState = createInitialState(2, [0, 1]); // Red vs Green
    });

    describe('Initialization', () => {
        it('should create initial state correctly', () => {
            const state = createInitialState(2, [0, 1]);
            expect(state.activeColors).toEqual([0, 1]);
            expect(state.gamePhase).toBe(GAME_PHASE.ROLL_DICE);
            expect(state.activePlayer).toBe(0); // Red starts
            expect(state.tokens[0]).toHaveLength(4);
            expect(state.tokens[0].every(pos => pos === POSITION.IN_YARD)).toBe(true);
        });
    });

    describe('Dice Logic', () => {
        it('should switch phase to SELECT_TOKEN on valid roll', () => {
            // Force a 6 to ensure we have moves from yard
            const state = rollDice(initialState, 6);
            expect(state.diceValue).toBe(6);
            expect(state.gamePhase).toBe(GAME_PHASE.SELECT_TOKEN);
            expect(state.validMoves.length).toBeGreaterThan(0);
        });

        it('should auto-switch turn if no moves (e.g. rolling 1 with all in yard)', () => {
            const state = rollDice(initialState, 1);
            expect(state.diceValue).toBe(1);
            // Should stay waiting for roll, but for NEXT player
            expect(state.validMoves.length).toBe(0);
        });
    });

    describe('Movement Logic', () => {
        it('should move token out of yard on 6', () => {
            let state = rollDice(initialState, 6);
            const move = state.validMoves.find(m => m.tokenIndex === 0 && m.isSpawn);

            expect(move).toBeDefined();
            state = moveToken(state, move);

            // Red start position is 0
            expect(state.tokens[PLAYERS.RED][0]).toBe(0);
        });

        it('should move token along path', () => {
            initialState.tokens[PLAYERS.RED][0] = 0;

            let state = rollDice(initialState, 4);
            const move = state.validMoves.find(m => m.tokenIndex === 0);

            expect(move).toBeDefined();
            state = moveToken(state, move);

            expect(state.tokens[PLAYERS.RED][0]).toBe(4);
        });
    });

    describe('Capture Logic', () => {
        it('should capture opponent token', () => {
            initialState.tokens[PLAYERS.RED][0] = 10;
            initialState.tokens[PLAYERS.GREEN][0] = 14;
            initialState.activePlayer = 0;

            let state = rollDice(initialState, 4);
            const move = state.validMoves.find(m => m.tokenIndex === 0);

            expect(move).toBeDefined();
            state = moveToken(state, move);
            state = completeMoveAnimation(state);

            expect(state.tokens[PLAYERS.RED][0]).toBe(14);
            expect(state.tokens[PLAYERS.GREEN][0]).toBe(POSITION.IN_YARD);
            expect(state.gamePhase).toBe(GAME_PHASE.BONUS_MOVE);
        });
    });

    describe('Safe Zone Logic', () => {
        it('should NOT capture on safe zone (Globe/Star)', () => {
            initialState.tokens[PLAYERS.RED][0] = 4;
            initialState.tokens[PLAYERS.GREEN][0] = 8;

            let state = rollDice(initialState, 4);
            const move = state.validMoves.find(m => m.tokenIndex === 0);

            state = moveToken(state, move);
            state = completeMoveAnimation(state);

            expect(state.tokens[PLAYERS.RED][0]).toBe(8);
            expect(state.tokens[PLAYERS.GREEN][0]).toBe(8);
        });
    });
});
