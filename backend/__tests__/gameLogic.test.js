import { createInitialState, rollDice, moveToken } from '../../src/engine/gameLogic.js';
import { POSITION, GAME_PHASE } from '../../src/engine/constants.js';

describe('Game Logic Engine', () => {
    test('should create initial state with correct player count', () => {
        const state = createInitialState(2, [0, 1]);
        expect(state.playerCount).toBe(2);
        expect(state.activeColors).toEqual([0, 1]);
        expect(state.tokens).toHaveLength(4);
        expect(state.gamePhase).toBe(GAME_PHASE.ROLL_DICE);
    });

    test('should handle dice roll and transition to SELECT_TOKEN if moves exist', () => {
        let state = createInitialState(2, [0, 1]);
        // Force a 6 to ensure we have a move from yard
        state = rollDice(state, 6);

        expect(state.diceValue).toBe(6);
        expect(state.gamePhase).toBe(GAME_PHASE.SELECT_TOKEN);
        expect(state.validMoves.length).toBeGreaterThan(0);
    });

    test('should handle capture and grant bonus moves', () => {
        // Mock state where Player 0 (Red) can capture Player 1 (Green)
        const state = {
            tokens: [
                [10, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [15, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
            ],
            playerCount: 2,
            activeColors: [0, 1],
            activePlayer: 0,
            gamePhase: GAME_PHASE.SELECT_TOKEN,
            diceValue: 5,
            validMoves: [
                { tokenIndex: 0, fromPosition: 10, toPosition: 15, captures: [{ player: 1, tokenIndex: 0 }] }
            ]
        };

        const newState = moveToken(state, state.validMoves[0]);

        expect(newState.tokens[1][0]).toBe(POSITION.IN_YARD);
        expect(newState.bonusMoves).toBe(20); // Capture bonus is 20
        expect(newState.lastCapture).not.toBeNull();
    });

    test('should handle blockade (Strict rules)', () => {
        // Mock state where Player 1 has a blockade at pos 20
        // Player 0 is at pos 18 and rolls a 5 (total 23, but blocked at 20)
        const state = {
            tokens: [
                [18, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [20, 20, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
                [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
            ],
            playerCount: 2,
            activeColors: [0, 1],
            activePlayer: 0,
            gamePhase: GAME_PHASE.ROLL_DICE
        };

        const newState = rollDice(state, 5);

        // Should have no valid moves because index 20 is blocked
        expect(newState.validMoves.length).toBe(0);
        expect(newState.activePlayer).toBe(1); // Turn passed
    });
});
