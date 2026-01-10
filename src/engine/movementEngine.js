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
    const destination = calculateDestination(state, playerIndex, position, steps);

    if (destination === null) {
        return null;
    }

    return {
        tokenIndex,
        fromPosition: position,
        toPosition: destination,
        isSpawn: false,
        isHome: destination === POSITION.FINISHED,
        captures: (destination >= 0 && destination < MAIN_PATH_LENGTH)
            ? getCapturesAt(state, playerIndex, destination)
            : []
    };
}

export function calculateDestination(state, playerIndex, currentPos, steps) {
    const path = PLAYER_PATHS[playerIndex];
    if (!path) {
        console.error("Missing path for player", playerIndex);
        return null;
    }

    // Find current index in the pre-calculated path array
    const currentIndex = path.indexOf(currentPos);

    if (currentIndex === -1) {
        console.error(`Token at invalid position ${currentPos} for Player ${playerIndex}`);
        return null;
    }

    // Target index in the path array
    const targetIndex = currentIndex + steps;

    // CHECK: Overshot Goal
    if (targetIndex >= path.length) {
        // Strict exact-entry rule
        if (RULES.EXACT_HOME_ENTRY) {
            // If we land EXACTLY on the last index (which is goal-1 usually? No, let's check path gen)
            // generatePath includes 100-105. 105 is the last one.
            // If targetIndex == path.length - 1, we are on the Goal Cell (105).
            // If targetIndex > path.length - 1, we Overshot.
            logMove(`Overshot goal. Req: ${path.length - 1 - currentIndex}, Rolled: ${steps}`);
            return null;
        } else {
            return POSITION.FINISHED;
        }
    }

    // CHECK: Landed on Goal (Last Path Cell)
    // Assuming the last cell in PLAYER_PATHS is the final goal tile (105)
    // If we land on it, we are FINISHED.
    if (targetIndex === path.length - 1) {
        return POSITION.FINISHED;
    }

    // CHECK: Path Blockades
    // We must check every step from (currentIndex + 1) up to targetIndex
    for (let i = currentIndex + 1; i <= targetIndex; i++) {
        const stepPos = path[i];

        // Blockade check
        // Note: You cannot pass OR land on a blockade of opponents?
        // Standard Ludo: A blockade (2 tokens) blocks ALL passing.
        // Even your own? Usually yes.
        if (isBlockedByBlockade(state, playerIndex, stepPos)) {
            logMove(`Blocked at ${stepPos} by blockade`);
            return null;
        }
    }

    return path[targetIndex];
}

export function isBlockedByBlockade(state, movingPlayer, position) {
    if (!RULES.BLOCKADE_STRICT) return false;
    // Safe zones usually don't support blockades or don't block? 
    // Actually safe zones allow stacking, but do they block?
    // Constants said: Blockade size 2.

    // Cannot blockade inside home stretch or yard
    if (position >= HOME_STRETCH_START) return false;
    if (position === POSITION.IN_YARD) return false;

    const { playerCount } = state;

    for (let player = 0; player < playerCount; player++) {
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

    const { playerCount } = state;

    for (let player = 0; player < playerCount; player++) {
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
