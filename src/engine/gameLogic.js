/**
 * GAME LOGIC ENGINE - USA STANDARD LUDO RULES
 * 
 * Features:
 * - Safe Zone immunity (8 positions)
 * - Capture mechanics with +20 bonus
 * - Home entry with +10 bonus
 * - Triple-6 penalty (forfeit turn)
 * - Blockade system (2 same-color = impassable)
 * - Exact throw for goal entry
 * - Dynamic player count support
 */

import {
    TOKENS_PER_PLAYER,
    GAME_PHASE,
    POSITION,
    PLAYER_START_POSITIONS,
    RULES,
    DICE
} from './constants.js';

import {
    calculateMove,
    // We export these for potential UI use or debugging, 
    // essentially just re-exporting if needed for Board checks
    isBlockedByBlockade,
    getCapturesAt
} from './movementEngine.js';

// ============================================
// STATE INITIALIZATION
// ============================================

export function createInitialState(playerCount = 4, activeColors = [0, 1, 2, 3]) {
    // Validate player count
    const count = Math.max(2, Math.min(4, playerCount));

    // Sort active colors to ensure consistent turn order (Red -> Green -> Yellow -> Blue)
    const sortedColors = [...activeColors].sort((a, b) => a - b);

    return {
        tokens: [
            [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
            [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
            [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD],
            [POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD, POSITION.IN_YARD]
        ],
        playerCount: count,
        activeColors: sortedColors,
        activePlayer: sortedColors[0],
        gamePhase: GAME_PHASE.ROLL_DICE,
        diceValue: null,
        validMoves: [],
        consecutiveSixes: 0,
        bonusMoves: 0,
        lastCapture: null,
        winner: null,
        message: null,
        diceBag: [] // Smart RNG: Bag of remaining die rolls
    };
}

// ============================================
// DICE ROLL
// ============================================

export function rollDice(state, forcedValue = null) {
    let diceValue;
    let newDiceBag = [...(state.diceBag || [])];

    if (forcedValue !== null) {
        diceValue = forcedValue;
    } else {
        // Smart RNG: "Boosted Bag System" (~23% change of 6)
        // Bag = 2 full sets [1..6, 1..6] + 1 extra [6] = 13 dice (3 Sixes)
        // 3 / 13 ≈ 23.07%
        if (newDiceBag.length === 0) {
            newDiceBag = [
                1, 2, 3, 4, 5, 6,
                1, 2, 3, 4, 5, 6,
                6
            ];
            // Fisher-Yates Shuffle
            for (let i = newDiceBag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newDiceBag[i], newDiceBag[j]] = [newDiceBag[j], newDiceBag[i]];
            }
        }
        // Draw one value
        diceValue = newDiceBag.pop();
    }

    let newState = {
        ...state,
        diceValue,
        diceBag: newDiceBag,
        consecutiveSixes: diceValue === 6 ? state.consecutiveSixes + 1 : 0,
        message: null
    };

    // Triple-6 penalty check
    if (RULES.TRIPLE_SIX_PENALTY && newState.consecutiveSixes >= 3) {
        return {
            ...newState,
            gamePhase: GAME_PHASE.ROLL_DICE,
            activePlayer: getNextPlayer(state.activePlayer, state.activeColors),
            consecutiveSixes: 0,
            message: '⚠️ Triple 6! Turn forfeited!'
        };
    }

    // Calculate valid moves
    const validMoves = getValidMoves(newState);

    if (validMoves.length === 0) {
        // No valid moves - pass turn (unless rolled 6, then roll again)
        if (diceValue === 6 && RULES.BONUS_ON_SIX) {
            return {
                ...newState,
                gamePhase: GAME_PHASE.ROLL_DICE,
                message: 'No moves available, roll again!'
            };
        }

        return {
            ...newState,
            gamePhase: GAME_PHASE.ROLL_DICE,
            activePlayer: getNextPlayer(state.activePlayer, state.activeColors),
            consecutiveSixes: 0,
            message: 'No valid moves, passing turn...'
        };
    }

    return {
        ...newState,
        validMoves,
        gamePhase: GAME_PHASE.SELECT_TOKEN
    };
}

// ============================================
// VALID MOVES CALCULATION
// ============================================

function getValidMoves(state) {
    const { tokens, activePlayer, diceValue, activeColors } = state;

    // Safety check: is activePlayer valid?
    if (activeColors && !activeColors.includes(activePlayer)) {
        return [];
    }

    const playerTokens = tokens[activePlayer];
    const moves = [];

    playerTokens.forEach((position, tokenIndex) => {
        const move = calculateMove(state, activePlayer, tokenIndex, diceValue);
        if (move) {
            moves.push(move);
        }
    });

    return moves;
}

// Logic delegated to movementEngine.js
// calculateMove, calculateDestination, isBlockedByBlockade, getCapturesAt removed from here.

export { isBlockedByBlockade }; // Re-export for Board if needed? Or remove if unused externally.

// ============================================
// MOVE EXECUTION
// ============================================

export function moveToken(state, move) {
    const { activePlayer, tokens } = state;
    const newTokens = tokens.map(arr => [...arr]);

    newTokens[activePlayer][move.tokenIndex] = move.toPosition;

    let captureBonus = 0;
    if (move.captures && move.captures.length > 0) {
        move.captures.forEach(capture => {
            newTokens[capture.player][capture.tokenIndex] = POSITION.IN_YARD;
        });
        captureBonus = RULES.CAPTURE_BONUS * move.captures.length;
    }

    let homeBonus = 0;
    if (move.toPosition === POSITION.FINISHED) {
        homeBonus = RULES.HOME_BONUS;
    }

    const totalBonus = captureBonus + homeBonus;

    return {
        ...state,
        tokens: newTokens,
        lastCapture: move.captures?.length > 0 ? move.captures : null,
        bonusMoves: totalBonus,
        gamePhase: GAME_PHASE.MOVING,
        message: totalBonus > 0 ? `+${totalBonus} bonus moves!` : null
    };
}

// ============================================
// POST-MOVE PROCESSING
// ============================================

export function completeMoveAnimation(state) {
    const winner = checkWinner(state);
    if (winner !== null) {
        return {
            ...state,
            winner,
            gamePhase: GAME_PHASE.WIN,
            message: `🎉 Player ${winner + 1} wins!`
        };
    }

    let currentState = state;

    // CHECK FOR BONUS MOVES (Capture +20 or Home +10)
    if (currentState.bonusMoves > 0) {
        // Temporarily set diceValue to the bonus amount so getValidMoves can work
        const bonusState = {
            ...currentState,
            diceValue: currentState.bonusMoves,
            gamePhase: GAME_PHASE.BONUS_MOVE,
        };

        const validBonusMoves = getValidMoves(bonusState);

        if (validBonusMoves.length > 0) {
            return {
                ...currentState,
                diceValue: currentState.bonusMoves,
                gamePhase: GAME_PHASE.BONUS_MOVE,
                validMoves: validBonusMoves,
                bonusMoves: 0,
                message: `BONUS! Move ${currentState.bonusMoves} spaces!`
            };
        }

        // If no valid moves for the bonus, it is forfeited.
        // We fall through to the normal turn completion checking.
        currentState = { ...currentState, bonusMoves: 0, message: "Bonus forfeited! No active tokens." };
    }

    // NORMAL TURN COMPLETION

    // Check if we should roll again (because we rolled a 6)
    // We check consecutiveSixes to see if the LAST roll was a 6 sequence
    if (currentState.consecutiveSixes > 0 && RULES.BONUS_ON_SIX) {
        return {
            ...currentState,
            gamePhase: GAME_PHASE.ROLL_DICE,
            diceValue: null,
            validMoves: [],
            bonusMoves: 0
        };
    }

    // Next player's turn
    return {
        ...currentState,
        activePlayer: getNextPlayer(currentState.activePlayer, currentState.activeColors),
        gamePhase: GAME_PHASE.ROLL_DICE,
        diceValue: null,
        validMoves: [],
        consecutiveSixes: 0,
        bonusMoves: 0
    };
}

// ============================================
// WIN CONDITION
// ============================================

function checkWinner(state) {
    const { playerCount } = state;

    for (let player = 0; player < playerCount; player++) {
        const allFinished = state.tokens[player].every(
            pos => pos === POSITION.FINISHED
        );
        if (allFinished) return player;
    }
    return null;
}

// ============================================
// UTILITIES
// ============================================

function getNextPlayer(current, activeColors) {
    if (!activeColors || activeColors.length === 0) return 0;

    const currentIndex = activeColors.indexOf(current);
    if (currentIndex === -1) return activeColors[0]; // Fallback

    const nextIndex = (currentIndex + 1) % activeColors.length;
    return activeColors[nextIndex];
}

export function isSafePosition(position) {
    return SAFE_POSITIONS.includes(position);
}

/**
 * Serialize game state for storage/blockchain
 */
export function serializeState(state) {
    return JSON.stringify(state);
}

/**
 * Deserialize game state from storage/blockchain
 */
export function deserializeState(json) {
    return JSON.parse(json);
}
