/**
 * Game Mode Strategy Pattern
 *
 * Adapts to the existing state model: tokens[colorIndex][tokenIndex] = positionNumber
 * POSITION.IN_YARD = -1, POSITION.FINISHED = 999
 * PLAYER_START_POSITIONS = [0, 13, 26, 39]
 */

import type { GameState, TokenPosition } from '../../src/types/index.js';

// ============================================
// CONSTANTS (mirrored from src/engine/constants)
// ============================================

const POSITION_IN_YARD: TokenPosition = -1 as TokenPosition;
const POSITION_FINISHED: TokenPosition = 999 as TokenPosition;
const PLAYER_START_POSITIONS = [0, 13, 26, 39];
const TOKENS_PER_PLAYER = 4;

// ============================================
// STRATEGY INTERFACE
// ============================================

export type GameModeType = 'classic' | 'rapid';

export interface IGameMode {
    readonly id: GameModeType;
    readonly name: string;
    readonly description: string;
    readonly minPlayers: number;
    readonly maxPlayers: number;
    readonly rules: GameModeRules;

    /** Returns initial token positions array for a given color index */
    getInitialTokens(colorIndex: number): TokenPosition[];

    /** Check if a player has won. Returns true if win condition met. */
    checkWinCondition(state: GameState, colorIndex: number): boolean;

    /** Whether the game should end immediately when first win is detected */
    readonly endsOnFirstWin: boolean;
}

export interface GameModeRules {
    readonly tokensPerPlayer: number;
    readonly tokensStartOutside: number;
    readonly diceToExit: number;
    readonly canCapture: boolean;
}

// ============================================
// CLASSIC MODE
// ============================================

export class ClassicMode implements IGameMode {
    readonly id = 'classic' as const;
    readonly name = 'Classic Ludo';
    readonly description = 'Traditional Ludo. Get all 4 tokens home to win.';
    readonly minPlayers = 2;
    readonly maxPlayers = 4;
    readonly endsOnFirstWin = true;

    readonly rules: GameModeRules = {
        tokensPerPlayer: TOKENS_PER_PLAYER,
        tokensStartOutside: 0,
        diceToExit: 6,
        canCapture: true,
    };

    getInitialTokens(_colorIndex: number): TokenPosition[] {
        return [
            POSITION_IN_YARD,
            POSITION_IN_YARD,
            POSITION_IN_YARD,
            POSITION_IN_YARD,
        ];
    }

    checkWinCondition(state: GameState, colorIndex: number): boolean {
        const tokens = state.tokens[colorIndex];
        if (!tokens) return false;
        return tokens.every(pos => pos === POSITION_FINISHED);
    }
}

// ============================================
// RAPID MODE
// ============================================

export class RapidMode implements IGameMode {
    readonly id = 'rapid' as const;
    readonly name = 'Rapid Ludo';
    readonly description = 'Fast-paced! 2 tokens start on the board. First to finish wins!';
    readonly minPlayers = 2;
    readonly maxPlayers = 4;
    readonly endsOnFirstWin = true;

    readonly rules: GameModeRules = {
        tokensPerPlayer: TOKENS_PER_PLAYER,
        tokensStartOutside: 2,
        diceToExit: 6,
        canCapture: true,
    };

    getInitialTokens(colorIndex: number): TokenPosition[] {
        const startPos = PLAYER_START_POSITIONS[colorIndex] as TokenPosition;
        return [
            startPos,         // Token 0: starts on board
            startPos,         // Token 1: starts on board
            POSITION_IN_YARD, // Token 2: needs 6 to exit
            POSITION_IN_YARD, // Token 3: needs 6 to exit
        ];
    }

    checkWinCondition(state: GameState, colorIndex: number): boolean {
        const tokens = state.tokens[colorIndex];
        if (!tokens) return false;
        return tokens.every(pos => pos === POSITION_FINISHED);
    }
}

// ============================================
// MODE REGISTRY
// ============================================

const GAME_MODES: Record<GameModeType, IGameMode> = {
    classic: new ClassicMode(),
    rapid: new RapidMode(),
};

export function getGameMode(modeId: GameModeType): IGameMode {
    const mode = GAME_MODES[modeId];
    if (!mode) throw new Error(`Unknown game mode: ${modeId}`);
    return mode;
}

export function isValidGameMode(modeId: string): modeId is GameModeType {
    return modeId in GAME_MODES;
}
