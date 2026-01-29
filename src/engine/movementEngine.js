import {
    PLAYERS,
    PLAYER_PATHS,
    POSITION,
    RULES,
    MAIN_PATH_LENGTH,
    HOME_STRETCH_START,
    PLAYER_START_POSITIONS,
    SAFE_POSITIONS
} from './constants.js';

/**
 * MOVEMENT ENGINE
 * Handles all path calculations, validations, and rule checks.
 * Detached from state management for purity and testing.
 */

// Logging helper to track logic in console
const logMove = (msg, ...args) => {
    // console.log(`[MoveEngine] ${msg}`, ...args);
};

export function calculateMove(state, playerIndex, tokenIndex, steps) {
    const position = state.tokens[playerIndex][tokenIndex];

    // 1. Handle Yard Exit (Spawn)
    if (position === POSITION.IN_YARD) {
        if (steps === RULES.ENTRY_ROLL) {
            const startPos = PLAYER_START_POSITIONS[playerIndex];

            // Blockade Check on Spawn Point
            if (isBlockedByBlockade(state, playerIndex, startPos)) {
                logMove(`Spawn blocked for Player ${playerIndex} at ${startPos}`);
                return null;
            }

            return {
                tokenIndex,
                fromPosition: position,
                toPosition: startPos,
                isSpawn: true,
                traversePath: [startPos], // Spawn is a single hop
                captures: getCapturesAt(state, playerIndex, startPos)
            };
        }
        return null;
    }

    // 2. Handle Finished Tokens
    if (position === POSITION.FINISHED) {
        return null;
    }

    // 3. Calculate Board Destination
    const result = calculateDestinationWithPath(state, playerIndex, position, steps);

    if (result === null) {
        return null;
    }

    return {
        tokenIndex,
        fromPosition: position,
        toPosition: result.destination,
        traversePath: result.path,
        isSpawn: false,
        isHome: result.destination === POSITION.FINISHED,
        captures: (result.destination >= 0 && result.destination < MAIN_PATH_LENGTH)
            ? getCapturesAt(state, playerIndex, result.destination)
            : []
    };
}

export function calculateDestinationWithPath(state, playerIndex, currentPos, steps) {
    const path = PLAYER_PATHS[playerIndex];
    if (!path) return null;

    const currentIndex = path.indexOf(currentPos);
    if (currentIndex === -1) return null;

    const targetIndex = currentIndex + steps;
    const traversePath = [];

    // CHECK: Overshot Goal
    if (targetIndex >= path.length) {
        if (RULES.EXACT_HOME_ENTRY) return null;
        else {
            // Fill path up to goal
            for (let i = currentIndex + 1; i < path.length; i++) {
                traversePath.push(path[i]);
            }
            return { destination: POSITION.FINISHED, path: traversePath };
        }
    }

    // CHECK: Path Blockades & Fill Traverse Path
    for (let i = currentIndex + 1; i <= targetIndex; i++) {
        const stepPos = path[i];
        if (isBlockedByBlockade(state, playerIndex, stepPos)) return null;
        traversePath.push(stepPos);
    }

    // CHECK: Reached Goal (Exact Match)
    if (targetIndex === path.length - 1) {
        // Fill path up to goal
        for (let i = currentIndex + 1; i <= targetIndex; i++) {
            traversePath.push(path[i]);
        }
        return { destination: POSITION.FINISHED, path: traversePath };
    }

    return { destination: path[targetIndex], path: traversePath };
}



export function isBlockedByBlockade(state, movingPlayer, position) {
    if (!RULES.BLOCKADE_STRICT) return false;
    // Safe zones usually don't support blockades or don't block? 
    // Actually safe zones allow stacking, but do they block?
    // Constants said: Blockade size 2.

    // Cannot blockade inside home stretch or yard
    if (position >= HOME_STRETCH_START) return false;
    if (position === POSITION.IN_YARD) return false;

    const playersToCheck = state.activeColors || [0, 1, 2, 3];
    for (const player of playersToCheck) {
        // Blockades are formed by ANY player (opponents usually, sometimes own)
        // Let's assume ANY blockade stops movement.
        let tokensAtPos = 0;
        state.tokens[player].forEach(pos => {
            if (pos === position) tokensAtPos++;
        });

        if (tokensAtPos >= RULES.BLOCKADE_SIZE) {
            return true;
        }
    }

    return false;
}

export function getCapturesAt(state, movingPlayer, position) {
    const captures = [];

    // Safety checks
    if (SAFE_POSITIONS.includes(position)) return captures;
    if (position >= HOME_STRETCH_START) return captures;

    const playersToCheck = state.activeColors || [0, 1, 2, 3];
    for (const player of playersToCheck) {
        if (player === movingPlayer) continue;

        state.tokens[player].forEach((pos, tokenIndex) => {
            if (pos === position) {
                captures.push({ player, tokenIndex });
            }
        });
    }

    // Standard Ludo: Capture happens if landing on opponent's single token.
    // If opponent has 2 tokens (Blockade), we already returned NULL in validation, so we never reach here?
    // Correct. But if BLOCKADE_STRICT is false, we might land here.
    // If landing on a blockade captures it? Usually no, blockades are safe.
    // But let's assume validMoves filter protected us.

    return captures;
}
