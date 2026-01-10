/**
 * Game Rules Index
 * 
 * Central export point for all game rule implementations.
 * Uses Strategy Pattern to allow easy switching between game modes.
 */

import type { IGameRules } from '@types/index';
import type { GameModeId } from '@types/index';
import { classicRules } from './classicRules';
import { fastRules } from './fastRules';

/**
 * Map of game mode IDs to their rule implementations
 */
const RULES_MAP: Record<GameModeId, IGameRules | null> = {
    classic: classicRules,
    fast: fastRules,
    team: null, // Coming soon
    blitz: null, // Coming soon
    tournament: null // Coming soon
};

/**
 * Get rules for a specific game mode
 * 
 * @param modeId - Game mode identifier
 * @returns Rule implementation for the mode
 * @throws Error if mode is not implemented
 * 
 * @example
 * ```ts
 * const rules = getRulesForMode('fast');
 * if (rules.canStartWithRoll(5)) {
 *   // Player can start with a 5 in fast mode
 * }
 * ```
 */
export function getRulesForMode(modeId: GameModeId): IGameRules {
    const rules = RULES_MAP[modeId];

    if (!rules) {
        throw new Error(`Game mode "${modeId}" is not yet implemented`);
    }

    return rules;
}

/**
 * Check if a game mode is available
 * 
 * @param modeId - Game mode identifier
 * @returns True if mode is implemented
 */
export function isModeAvailable(modeId: GameModeId): boolean {
    return RULES_MAP[modeId] !== null;
}

// Export individual rule sets
export { classicRules } from './classicRules';
export { fastRules } from './fastRules';

// Export types
export type { IGameRules } from '@types/index';
