/**
 * GAME LOGIC ENGINE - USA STANDARD LUDO RULES
 * Supports multiple game modes via Strategy Pattern (see backend/engine/GameMode.ts)
 */

import {
    GAME_MODES,
    GAME_PHASE,
    POSITION,
    RULES,
    SAFE_POSITIONS
} from './constants';

import {
    calculateMove,
    isBlockedByBlockade
} from './movementEngine';

import { GameState, GameModeId, Move, TokenPosition } from '../types';

// ============================================
// STATE INITIALIZATION
// ============================================

// ============================================
// STATE INITIALIZATION
// ============================================

export function createInitialState(
    _playerCount: number = 4,
    activeColors: number[] = [0, 1, 2, 3],
    mode: GameModeId = 'classic'
): GameState {
    const sortedColors = [...activeColors].sort((a, b) => a - b);

    const modeConfig = GAME_MODES[mode] || GAME_MODES.classic;

    const tokens: TokenPosition[][] = [
        modeConfig.getInitialTokens(0),
        modeConfig.getInitialTokens(1),
        modeConfig.getInitialTokens(2),
        modeConfig.getInitialTokens(3),
    ];

    return {
        tokens,
        activeColors: sortedColors,
        activePlayer: sortedColors[0] ?? 0,
        gamePhase: GAME_PHASE.ROLL_DICE as any,
        diceValue: null,
        validMoves: [],
        consecutiveSixes: 0,
        bonusMoves: 0,
        winner: null,
        message: '',
        mode,
        sequenceNumber: 0
    } as unknown as GameState;
}

// ============================================
// DICE ROLL
// ============================================

export function rollDice(state: GameState, forcedValue: number | null = null): GameState {
    let diceValue: number;

    if (forcedValue !== null) {
        diceValue = forcedValue;
    } else {
        // LOCAL/AI GAMES ONLY: Math.random() is acceptable here — no real money at stake.
        // For Web3 (real-money) games, the server uses crypto.randomInt(1, 7) and passes
        // the result as `forcedValue` above. See: backend/server.ts roll_dice handler.
        diceValue = Math.floor(Math.random() * 6) + 1;
    }

    let newState: GameState = {
        ...state,
        diceValue,
        consecutiveSixes: diceValue === 6 ? (state.consecutiveSixes || 0) + 1 : 0,
        message: '',
        sequenceNumber: (state.sequenceNumber || 0) + 1
    };

    // Triple-6 penalty check
    if (RULES.TRIPLE_SIX_PENALTY && newState.consecutiveSixes >= 3) {
        return {
            ...newState,
            gamePhase: GAME_PHASE.ROLL_DICE as any,
            activePlayer: getNextPlayer(state.activePlayer, state.activeColors),
            consecutiveSixes: 0,
            diceValue: null,
            validMoves: [],
            bonusMoves: 0,
            message: '⚠️ Triple 6! Turn forfeited!'
        };
    }

    const validMoves = getValidMoves(newState);

    if (validMoves.length === 0) {
        if (diceValue === 6 && RULES.BONUS_ON_SIX) {
            return {
                ...newState,
                gamePhase: GAME_PHASE.ROLL_DICE as any,
                message: 'No moves available, roll again!'
            };
        }

        return {
            ...newState,
            gamePhase: GAME_PHASE.ROLL_DICE as any,
            activePlayer: getNextPlayer(state.activePlayer, state.activeColors),
            consecutiveSixes: 0,
            message: 'No valid moves, passing turn...'
        };
    }

    return {
        ...newState,
        validMoves,
        gamePhase: GAME_PHASE.SELECT_TOKEN as any
    };
}

// ============================================
// VALID MOVES CALCULATION
// ============================================

function getValidMoves(state: GameState): Move[] {
    const { tokens, activePlayer, diceValue, activeColors } = state;

    if (!activeColors.includes(activePlayer)) {
        return [];
    }

    const playerTokens = tokens[activePlayer]!;
    const moves: Move[] = [];

    playerTokens.forEach((_, tokenIndex) => {
        if (diceValue !== null) {
            const move = calculateMove(state, activePlayer, tokenIndex, diceValue);
            if (move) {
                moves.push(move);
            }
        }
    });

    return moves;
}

export { isBlockedByBlockade };

// ============================================
// MOVE EXECUTION
// ============================================

export function moveToken(state: GameState, move: Move): GameState {
    const { activePlayer, tokens } = state;
    const newTokens = tokens.map(arr => [...arr]);

    newTokens[activePlayer]![move.tokenIndex] = move.toPosition;

    if (move.captures && move.captures.length > 0) {
        move.captures.forEach(capture => {
            newTokens[capture.player]![capture.tokenIndex] = POSITION.IN_YARD;
        });
    }

    let bonus = 0;
    if (move.captures && move.captures.length > 0) bonus = RULES.CAPTURE_BONUS;
    if (move.toPosition === POSITION.FINISHED) bonus = RULES.HOME_BONUS;

    return {
        ...state,
        tokens: newTokens,
        bonusMoves: bonus,
        gamePhase: 'ANIMATING' as any,
        message: bonus > 0 ? `+${bonus} bonus moves!` : '',
        sequenceNumber: (state.sequenceNumber || 0) + 1
    };
}

// ============================================
// POST-MOVE PROCESSING
// ============================================

export function completeMoveAnimation(state: GameState): GameState {
    const winner = checkWinner(state);
    if (winner !== null) {
        return {
            ...state,
            winner,
            gamePhase: 'WIN' as any,
            message: `🎉 Player ${winner + 1} wins!`,
            sequenceNumber: (state.sequenceNumber || 0) + 1
        };
    }

    let currentState = state;

    if (currentState.bonusMoves > 0) {
        const bonusState = {
            ...currentState,
            diceValue: currentState.bonusMoves,
            gamePhase: 'BONUS_MOVE' as any,
        };

        const validBonusMoves = getValidMoves(bonusState);

        if (validBonusMoves.length > 0) {
            return {
                ...currentState,
                diceValue: currentState.bonusMoves,
                gamePhase: 'BONUS_MOVE' as any,
                validMoves: validBonusMoves,
                bonusMoves: 0,
                message: `BONUS! Move ${currentState.bonusMoves} spaces!`,
                sequenceNumber: (currentState.sequenceNumber || 0) + 1
            };
        }

        currentState = { ...currentState, bonusMoves: 0, message: "Bonus forfeited! No active tokens." };
    }

    if (currentState.consecutiveSixes > 0 && RULES.BONUS_ON_SIX) {
        return {
            ...currentState,
            gamePhase: 'ROLL_DICE' as any,
            diceValue: null,
            validMoves: [],
            bonusMoves: 0
        };
    }

    return {
        ...currentState,
        activePlayer: getNextPlayer(currentState.activePlayer, currentState.activeColors),
        gamePhase: 'ROLL_DICE' as any,
        diceValue: null,
        validMoves: [],
        consecutiveSixes: 0,
        bonusMoves: 0,
        sequenceNumber: (currentState.sequenceNumber || 0) + 1
    };
}

// ============================================
// WIN CONDITION
// ============================================

function checkWinner(state: GameState): number | null {
    const { activeColors, mode, tokens } = state;
    const modeConfig = GAME_MODES[mode] || GAME_MODES.classic;

    return modeConfig.checkWinner(tokens, activeColors);
}

// ============================================
// UTILITIES
// ============================================

function getNextPlayer(current: number, activeColors: number[]): number {
    if (activeColors.length === 0) return 0;
    const currentIndex = activeColors.indexOf(current);
    const nextIndex = (currentIndex + 1) % activeColors.length;
    return activeColors[nextIndex]!;
}

export function isSafePosition(position: TokenPosition): boolean {
    return typeof position === 'number' && SAFE_POSITIONS.includes(position);
}

export function serializeState(state: GameState): string {
    return JSON.stringify(state);
}

export function deserializeState(json: string): GameState {
    return JSON.parse(json);
}
