import {
    SAFE_POSITIONS,
    MAIN_PATH_LENGTH,
    HOME_STRETCH_START,
    POSITION,
    PLAYER_PATHS
} from './constants';
import { GameState, Move, TokenPosition } from '../types';

const SCORES = {
    CAPTURE: 100,
    HOME_ENTRY: 80,
    SAFE_ZONE: 40,
    DANGER_ESCAPE: 30,
    HOME_STRETCH_ENTRY: 35,
    SPAWN_EMPTY: 50,
    SPAWN_NEW: 25,
    SPAWN_ADDITIONAL: 10,
    DANGER_PENALTY: -15
};

/**
 * Calculate the best move for AI player
 */
export function calculateAIMove(gameState: GameState): Move | null {
    const { validMoves, tokens, activePlayer } = gameState;

    if (!validMoves || validMoves.length === 0) {
        return null;
    }

    if (validMoves.length === 1) {
        return validMoves[0]!;
    }

    // Score each move
    const scoredMoves = validMoves.map(move => ({
        move,
        score: evaluateMove(move, tokens, activePlayer, gameState.activeColors)
    }));

    // Sort by score (highest first)
    scoredMoves.sort((a, b) => b.score - a.score);

    // Add slight randomness for variety (pick from top 2 if scores are close)
    if (scoredMoves.length >= 2) {
        const scoreDiff = scoredMoves[0]!.score - scoredMoves[1]!.score;
        if (scoreDiff < 5 && Math.random() < 0.3) {
            return scoredMoves[1]!.move;
        }
    }

    return scoredMoves[0]!.move;
}

/**
 * Evaluate a move and return a score
 */
function evaluateMove(move: Move, tokens: TokenPosition[][], activePlayer: number, activeColors: number[]): number {
    let score = 0;

    // Priority 1: Capture enemy
    if (move.captures && move.captures.length > 0) {
        score += SCORES.CAPTURE * move.captures.length;

        move.captures.forEach(capture => {
            const capturedPos = tokens[capture.player]?.[capture.tokenIndex];
            if (typeof capturedPos === 'number') {
                if (capturedPos >= HOME_STRETCH_START) {
                    score += 50;
                } else if (capturedPos > 30) {
                    score += 20;
                }
            }
        });
    }

    // Priority 2: Reach home
    if (move.toPosition === POSITION.FINISHED) {
        score += SCORES.HOME_ENTRY;
    }

    // Priority 3: Enter safe zone
    if (typeof move.toPosition === 'number' && SAFE_POSITIONS.includes(move.toPosition)) {
        score += SCORES.SAFE_ZONE;

        if (isInDanger(move.fromPosition, tokens, activePlayer, activeColors)) {
            score += SCORES.DANGER_ESCAPE;
        }
    }

    // Priority 4: Enter home stretch
    if (typeof move.toPosition === 'number' && typeof move.fromPosition === 'number' &&
        move.toPosition >= HOME_STRETCH_START &&
        move.toPosition !== (POSITION.FINISHED as TokenPosition) &&
        move.fromPosition < HOME_STRETCH_START) {
        score += SCORES.HOME_STRETCH_ENTRY;
    }

    // Priority 5: Spawn new token
    if (move.isSpawn) {
        const playerTokens = tokens[activePlayer];
        const tokensOnBoard = playerTokens ? playerTokens.filter(
            p => p !== POSITION.IN_YARD && p !== POSITION.FINISHED
        ).length : 0;

        if (tokensOnBoard === 0) {
            score += SCORES.SPAWN_EMPTY;
        } else if (tokensOnBoard < 2) {
            score += SCORES.SPAWN_NEW;
        } else {
            score += SCORES.SPAWN_ADDITIONAL;
        }
    }

    // Priority 6: Escape danger
    if (isInDanger(move.fromPosition, tokens, activePlayer, activeColors) &&
        !isInDanger(move.toPosition, tokens, activePlayer, activeColors)) {
        score += SCORES.DANGER_ESCAPE;
    }

    // Priority 7: Advance position (+ progress factor)
    if (typeof move.toPosition === 'number') {
        const progress = getRelativeProgress(move.toPosition, activePlayer);
        score += progress / 10;
    }

    // Penalty: Moving to danger
    if (typeof move.toPosition === 'number' &&
        isInDanger(move.toPosition, tokens, activePlayer, activeColors)) {
        score += SCORES.DANGER_PENALTY;
    }

    return score;
}

/**
 * Check if a position is in danger
 */
function isInDanger(position: TokenPosition, tokens: TokenPosition[][], currentPlayer: number, activeColors: number[]): boolean {
    if (position === POSITION.IN_YARD || position === POSITION.FINISHED) {
        return false;
    }

    if (typeof position === 'number') {
        if (position >= HOME_STRETCH_START) {
            return false;
        }

        if (SAFE_POSITIONS.includes(position)) {
            return false;
        }

        const colors = activeColors || [0, 1, 2, 3];
        for (const player of colors) {
            if (player === currentPlayer) continue;

            const playerTokens = tokens[player];
            if (!playerTokens) continue;
            for (const tokenPos of playerTokens) {
                if (tokenPos === POSITION.IN_YARD || tokenPos === POSITION.FINISHED || typeof tokenPos !== 'number') {
                    continue;
                }

                if (tokenPos >= HOME_STRETCH_START) {
                    continue;
                }

                for (let dice = 1; dice <= 6; dice++) {
                    const enemyDest = (tokenPos + dice) % MAIN_PATH_LENGTH;
                    if (enemyDest === position) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

/**
 * Get relative progress for a token on its path (0-56)
 */
function getRelativeProgress(position: TokenPosition, player: number): number {
    if (position === POSITION.IN_YARD) return 0;
    if (position === POSITION.FINISHED) return 57;

    const path = PLAYER_PATHS[player];
    const pos = position as number;
    return path ? path.indexOf(pos) : 0;
}

/**
 * Select a random valid move
 */
export function selectRandomMove(validMoves: Move[]): Move | null {
    if (!validMoves || validMoves.length === 0) return null;
    const index = Math.floor(Math.random() * validMoves.length);
    return validMoves[index] ?? null;
}
