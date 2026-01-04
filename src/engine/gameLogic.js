/**
 * GAME LOGIC ENGINE - Pure Functions
 * 
 * This module contains all game rule enforcement, move validation,
 * and state transition logic. All functions are pure (no side effects)
 * for easy testing and predictability.
 */

import {
    PLAYERS,
    PLAYER_START_POSITIONS,
    HOME_ENTRY_POSITIONS,
    MAIN_PATH_LENGTH,
    HOME_STRETCH_START,
    HOME_STRETCH_LENGTH,
    POSITION,
    SAFE_POSITIONS,
    DICE
} from './constants.js';

// ============================================
// INITIAL STATE
// ============================================

export function createInitialState() {
    return {
        gamePhase: 'ROLL_DICE',
        activePlayer: 0,
        diceValue: null,
        rolledSix: false,  // Track if current roll was a 6
        consecutiveSixes: 0,  // Track consecutive 6s (optional rule: 3 sixes = forfeit turn)

        // Token positions: -1 = yard, 0-51 = main path, 100-105 = home stretch, 999 = finished
        tokens: [
            [-1, -1, -1, -1],  // Red
            [-1, -1, -1, -1],  // Green
            [-1, -1, -1, -1],  // Yellow
            [-1, -1, -1, -1]   // Blue
        ],

        // Track which tokens can move (for UI highlighting)
        validMoves: [],

        // Winner tracking
        winner: null
    };
}

// ============================================
// MOVE VALIDATION
// ============================================

/**
 * Get all valid moves for the current player based on dice roll.
 * Returns array of {tokenIndex, targetPosition, canCapture}
 */
export function getValidMoves(state) {
    const moves = [];
    const playerTokens = state.tokens[state.activePlayer];
    const rolled = state.diceValue;

    if (!rolled) return moves;

    playerTokens.forEach((position, tokenIndex) => {
        const move = calculateMove(state.activePlayer, position, rolled, state.tokens);
        if (move.valid) {
            moves.push({
                tokenIndex,
                from: position,
                to: move.targetPosition,
                canCapture: move.canCapture,
                capturedPlayer: move.capturedPlayer,
                capturedToken: move.capturedToken
            });
        }
    });

    return moves;
}

/**
 * Calculate if a single token can move with the given dice value.
 * DEV NOTE: This is the core rules engine.
 */
function calculateMove(playerId, currentPosition, diceValue, allTokens) {
    // Rule 1: Tokens in yard can only exit with a 6
    if (currentPosition === POSITION.IN_YARD) {
        if (diceValue === DICE.SPECIAL_ROLL) {
            const startPos = PLAYER_START_POSITIONS[playerId];
            return {
                valid: true,
                targetPosition: startPos,
                canCapture: checkCapture(playerId, startPos, allTokens)
            };
        }
        return { valid: false };
    }

    // Rule 2: Finished tokens cannot move
    if (currentPosition === POSITION.FINISHED) {
        return { valid: false };
    }

    // Rule 3: Tokens in home stretch (100-105)
    if (currentPosition >= HOME_STRETCH_START) {
        const homeIndex = currentPosition - HOME_STRETCH_START;
        const newHomeIndex = homeIndex + diceValue;

        // Must land exactly on finish (105 -> position 5 in home stretch)
        if (newHomeIndex === HOME_STRETCH_LENGTH - 1) {
            return {
                valid: true,
                targetPosition: POSITION.FINISHED,
                canCapture: false
            };
        }

        // Cannot overshoot
        if (newHomeIndex >= HOME_STRETCH_LENGTH) {
            return { valid: false };
        }

        // Valid move within home stretch
        return {
            valid: true,
            targetPosition: HOME_STRETCH_START + newHomeIndex,
            canCapture: false  // Cannot capture in home stretch
        };
    }

    // Rule 4: Tokens on main path (0-51)
    const homeEntryPos = HOME_ENTRY_POSITIONS[playerId];
    const distanceToHome = calculateDistance(currentPosition, homeEntryPos, MAIN_PATH_LENGTH);

    // Check if this move will pass the home entry
    if (diceValue >= distanceToHome) {
        const stepsIntoHome = diceValue - distanceToHome;

        // Can we enter and move within home?
        if (stepsIntoHome < HOME_STRETCH_LENGTH) {
            return {
                valid: true,
                targetPosition: HOME_STRETCH_START + stepsIntoHome,
                canCapture: false
            };
        }

        // Overshoot - cannot enter home
        return { valid: false };
    }

    // Normal move on main path
    const targetPosition = (currentPosition + diceValue) % MAIN_PATH_LENGTH;
    const captureInfo = checkCapture(playerId, targetPosition, allTokens);

    return {
        valid: true,
        targetPosition,
        canCapture: captureInfo.canCapture,
        capturedPlayer: captureInfo.capturedPlayer,
        capturedToken: captureInfo.capturedToken
    };
}

/**
 * Calculate clockwise distance between two positions on the main loop.
 */
function calculateDistance(from, to, pathLength) {
    if (to >= from) {
        return to - from;
    }
    return (pathLength - from) + to;
}

/**
 * Check if moving to this position would capture an opponent.
 * DEV NOTE: Safe zones cannot be captured.
 */
function checkCapture(playerId, targetPosition, allTokens) {
    // Safe positions cannot capture
    if (SAFE_POSITIONS.includes(targetPosition)) {
        return { canCapture: false };
    }

    // Check all other players' tokens
    for (let p = 0; p < allTokens.length; p++) {
        if (p === playerId) continue;

        const opponentTokens = allTokens[p];
        const tokenIndex = opponentTokens.findIndex(pos => pos === targetPosition);

        if (tokenIndex !== -1) {
            return {
                canCapture: true,
                capturedPlayer: p,
                capturedToken: tokenIndex
            };
        }
    }

    return { canCapture: false };
}

// ============================================
// STATE TRANSITIONS
// ============================================

/**
 * Execute a dice roll and update game state.
 */
export function rollDice(state) {
    const diceValue = Math.floor(Math.random() * DICE.MAX) + DICE.MIN;
    const rolledSix = diceValue === DICE.SPECIAL_ROLL;

    const newState = {
        ...state,
        diceValue,
        rolledSix,
        consecutiveSixes: rolledSix ? state.consecutiveSixes + 1 : 0,
        gamePhase: 'SELECT_TOKEN'
    };

    // Get valid moves
    const validMoves = getValidMoves(newState);
    newState.validMoves = validMoves;

    // If no valid moves, end turn immediately
    if (validMoves.length === 0) {
        return endTurn(newState);
    }

    // If only one valid move, could auto-select (optional UX enhancement)
    // For now, player must click

    return newState;
}

/**
 * Execute a token move and handle captures.
 */
export function moveToken(state, moveData) {
    const { tokenIndex, to, capturedPlayer, capturedToken } = moveData;

    // Clone state
    const newTokens = state.tokens.map(player => [...player]);

    // Move the token
    newTokens[state.activePlayer][tokenIndex] = to;

    // Handle capture
    if (capturedPlayer !== undefined && capturedToken !== undefined) {
        newTokens[capturedPlayer][capturedToken] = POSITION.IN_YARD;
    }

    const newState = {
        ...state,
        tokens: newTokens,
        gamePhase: 'MOVING',
        validMoves: []
    };

    // Check for winner
    if (checkWinCondition(newTokens[state.activePlayer])) {
        return {
            ...newState,
            gamePhase: 'WIN',
            winner: state.activePlayer
        };
    }

    return newState;
}

/**
 * Complete the move animation and decide next action.
 */
export function completeMoveAnimation(state) {
    // If rolled a 6, player gets another turn
    if (state.rolledSix) {
        return {
            ...state,
            gamePhase: 'ROLL_DICE',
            diceValue: null
        };
    }

    // Otherwise, next player's turn
    return endTurn(state);
}

/**
 * End current player's turn and move to next player.
 */
function endTurn(state) {
    const nextPlayer = (state.activePlayer + 1) % 4;

    return {
        ...state,
        activePlayer: nextPlayer,
        gamePhase: 'ROLL_DICE',
        diceValue: null,
        rolledSix: false,
        validMoves: []
    };
}

/**
 * Check if all tokens have reached the finish.
 */
function checkWinCondition(playerTokens) {
    return playerTokens.every(pos => pos === POSITION.FINISHED);
}

// ============================================
// COORDINATE MAPPING
// ============================================

/**
 * Convert logical position to grid coordinates {r, c}.
 * This is used for rendering tokens on the 15x15 CSS grid.
 */
export function getCoordinates(playerId, position, masterLoop, homeStretchCoords, yardCoords) {
    // In yard
    if (position === POSITION.IN_YARD) {
        // Return yard coordinates (will be handled by yard rendering)
        return null;
    }

    // Finished
    if (position === POSITION.FINISHED) {
        // Center position
        return { r: 7, c: 7 };
    }

    // Home stretch (100-105)
    if (position >= HOME_STRETCH_START) {
        const homeIndex = position - HOME_STRETCH_START;
        return homeStretchCoords[playerId][homeIndex];
    }

    // Main path (0-51)
    return masterLoop[position];
}
