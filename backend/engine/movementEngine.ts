import {
    PLAYER_PATHS,
    POSITION,
    RULES,
    MAIN_PATH_LENGTH,
    HOME_STRETCH_START,
    PLAYER_START_POSITIONS,
    SAFE_POSITIONS
} from './constants';
import { GameState, TokenPosition, Move, Capture } from '../types';

/**
 * MOVEMENT ENGINE
 * Handles all path calculations, validations, and rule checks.
 * Detached from state management for purity and testing.
 */

// Logging helper to track logic in console
const logMove = (msg: string, ...args: any[]) => {
    // console.log(`[MoveEngine] ${msg}`, ...args);
};

export function calculateMove(state: GameState, playerIndex: number, tokenIndex: number, steps: number): Move | null {
    const position = state.tokens[playerIndex]![tokenIndex]!;

    // 1. Handle Yard Exit (Spawn)
    if (position === POSITION.IN_YARD) {
        if (steps === RULES.ENTRY_ROLL) {
            const startPos = PLAYER_START_POSITIONS[playerIndex]!;

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
        captures: (typeof result.destination === 'number' && result.destination >= 0 && result.destination < MAIN_PATH_LENGTH)
            ? getCapturesAt(state, playerIndex, result.destination)
            : []
    };
}

export function calculateDestinationWithPath(
    state: GameState,
    playerIndex: number,
    currentPos: TokenPosition,
    steps: number
): { destination: TokenPosition, path: TokenPosition[] } | null {
    const path = PLAYER_PATHS[playerIndex];
    if (!path) return null;

    const currentIndex = path.indexOf(currentPos);
    if (currentIndex === -1) return null;

    const targetIndex = currentIndex + steps;
    const traversePath: TokenPosition[] = [];

    // CHECK: Overshot Goal
    if (targetIndex >= path.length) {
        if (RULES.EXACT_HOME_ENTRY) return null;
        else {
            // Fill path up to goal
            for (let i = currentIndex + 1; i < path.length; i++) {
                traversePath.push(path[i]!);
            }
            return { destination: POSITION.FINISHED, path: traversePath };
        }
    }

    // CHECK: Path Blockades & Fill Traverse Path
    for (let i = currentIndex + 1; i <= targetIndex; i++) {
        const stepPos = path[i]!;
        if (isBlockedByBlockade(state, playerIndex, stepPos)) return null;
        traversePath.push(stepPos);
    }

    // CHECK: Reached Goal (Exact Match)
    if (targetIndex === path.length - 1) {
        return { destination: POSITION.FINISHED, path: traversePath };
    }

    return { destination: path[targetIndex]!, path: traversePath };
}

export function isBlockedByBlockade(state: GameState, movingPlayer: number, position: TokenPosition): boolean {
    if (!RULES.BLOCKADE_STRICT) return false;

    // Cannot blockade inside home stretch or yard
    if (typeof position === 'number' && position >= HOME_STRETCH_START) return false;
    if (position === POSITION.IN_YARD) return false;

    const playersToCheck = state.activeColors || [0, 1, 2, 3];
    for (const player of playersToCheck) {
        let tokensAtPos = 0;
        state.tokens[player]?.forEach(pos => {
            if (pos === position) tokensAtPos++;
        });

        if (tokensAtPos >= RULES.BLOCKADE_SIZE) {
            return true;
        }
    }

    return false;
}

export function getCapturesAt(state: GameState, movingPlayer: number, position: TokenPosition): Capture[] {
    const captures: Capture[] = [];

    // Safety checks
    if (typeof position === 'number' && SAFE_POSITIONS.includes(position)) return captures;
    if (typeof position === 'number' && position >= HOME_STRETCH_START) return captures;

    const playersToCheck = state.activeColors || [0, 1, 2, 3];
    for (const player of playersToCheck) {
        if (player === movingPlayer) continue;

        state.tokens[player]?.forEach((pos, tokenIndex) => {
            if (pos === position) {
                captures.push({ player, tokenIndex });
            }
        });
    }

    return captures;
}
