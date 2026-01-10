/**
 * AI ENGINE - GoLudo
 * 
 * Intelligent token selection with priority-based decision making:
 * 1. Capture enemy token (highest priority)
 * 2. Reach home (finish the game)
 * 3. Enter safe zone (protect from capture)
 * 4. Escape danger (move away from enemies)
 * 5. Spawn new token (if rolled 6)
 * 6. Advance furthest token (default)
 */

import {
    SAFE_POSITIONS,
    MAIN_PATH_LENGTH,
    HOME_STRETCH_START,
    POSITION
} from './constants';

/**
 * Calculate the best move for AI player
 * @param {Object} gameState - Current game state
 * @returns {Object|null} - Best move or null
 */
export function calculateAIMove(gameState) {
    const { validMoves, tokens, activePlayer } = gameState;

    if (!validMoves || validMoves.length === 0) {
        return null;
    }

    if (validMoves.length === 1) {
        return validMoves[0];
    }

    // Score each move
    const scoredMoves = validMoves.map(move => ({
        move,
        score: evaluateMove(move, tokens, activePlayer)
    }));

    // Sort by score (highest first)
    scoredMoves.sort((a, b) => b.score - a.score);

    // Add slight randomness for variety (pick from top 2 if scores are close)
    if (scoredMoves.length >= 2) {
        const scoreDiff = scoredMoves[0].score - scoredMoves[1].score;
        if (scoreDiff < 5 && Math.random() < 0.3) {
            return scoredMoves[1].move;
        }
    }

    return scoredMoves[0].move;
}

/**
 * Evaluate a move and return a score
 * Higher score = better move
 */
function evaluateMove(move, tokens, activePlayer) {
    let score = 0;

    // Priority 1: Capture enemy (+100)
    if (move.captures && move.captures.length > 0) {
        score += 100 * move.captures.length;

        // Extra points for capturing tokens close to home
        move.captures.forEach(capture => {
            const capturedPos = tokens[capture.player][capture.tokenIndex];
            if (capturedPos >= HOME_STRETCH_START) {
                score += 50; // Capturing token in home stretch is devastating
            } else if (capturedPos > 30) {
                score += 20; // Capturing advanced token
            }
        });
    }

    // Priority 2: Reach home (+80)
    if (move.toPosition === POSITION.FINISHED) {
        score += 80;
    }

    // Priority 3: Enter safe zone (+40)
    if (SAFE_POSITIONS.includes(move.toPosition)) {
        score += 40;

        // Extra if escaping from danger
        if (isInDanger(move.fromPosition, tokens, activePlayer)) {
            score += 30;
        }
    }

    // Priority 4: Enter home stretch (+35)
    if (move.toPosition >= HOME_STRETCH_START &&
        move.toPosition !== POSITION.FINISHED &&
        move.fromPosition < HOME_STRETCH_START) {
        score += 35;
    }

    // Priority 5: Spawn new token (+25)
    if (move.isSpawn) {
        // Count tokens on board
        const tokensOnBoard = tokens[activePlayer].filter(
            p => p !== POSITION.IN_YARD && p !== POSITION.FINISHED
        ).length;

        // More valuable to spawn if we have few tokens out
        if (tokensOnBoard === 0) {
            score += 50; // Must spawn if no tokens out
        } else if (tokensOnBoard < 2) {
            score += 25;
        } else {
            score += 10;
        }
    }

    // Priority 6: Escape danger (+20)
    if (isInDanger(move.fromPosition, tokens, activePlayer) &&
        !isInDanger(move.toPosition, tokens, activePlayer)) {
        score += 20;
    }

    // Priority 7: Advance position (+1 per step forward)
    if (move.toPosition >= 0 && move.toPosition < MAIN_PATH_LENGTH) {
        // Prefer advancing tokens that are further behind
        const progress = getRelativeProgress(move.toPosition, activePlayer);
        score += progress / 10;
    }

    // Penalty: Moving to danger (-15)
    if (move.toPosition >= 0 &&
        move.toPosition < MAIN_PATH_LENGTH &&
        isInDanger(move.toPosition, tokens, activePlayer)) {
        score -= 15;
    }

    return score;
}

/**
 * Check if a position is in danger (enemy within capture range)
 */
function isInDanger(position, tokens, currentPlayer) {
    if (position === POSITION.IN_YARD || position === POSITION.FINISHED) {
        return false;
    }

    if (position >= HOME_STRETCH_START) {
        return false; // Home stretch is always safe
    }

    if (SAFE_POSITIONS.includes(position)) {
        return false; // Safe zones are safe
    }

    // Check if any enemy can reach this position
    for (let player = 0; player < 4; player++) {
        if (player === currentPlayer) continue;

        for (const tokenPos of tokens[player]) {
            if (tokenPos === POSITION.IN_YARD || tokenPos === POSITION.FINISHED) {
                continue;
            }

            if (tokenPos >= HOME_STRETCH_START) {
                continue;
            }

            // Can enemy reach us in 1-6 steps?
            for (let dice = 1; dice <= 6; dice++) {
                const enemyDest = (tokenPos + dice) % MAIN_PATH_LENGTH;
                if (enemyDest === position) {
                    return true;
                }
            }
        }
    }

    return false;
}

/**
 * Get relative progress for a player (0-51 normalized)
 */
function getRelativeProgress(position, player) {
    // TODO: Implement player-specific offset calculation
    // For now, just return position as progress
    return position;
}

/**
 * Select a random valid move (fallback)
 */
export function selectRandomMove(validMoves) {
    if (!validMoves || validMoves.length === 0) return null;
    const index = Math.floor(Math.random() * validMoves.length);
    return validMoves[index];
}
