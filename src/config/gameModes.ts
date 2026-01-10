/**
 * Game Modes Configuration
 * 
 * Defines all available game modes with their properties.
 * Used for mode selection UI and rule validation.
 */

import type { GameMode } from '@types/index';

/**
 * Available game modes
 * 
 * Each mode has:
 * - Unique ID
 * - Display name and icon
 * - Description and features
 * - Rule set identifier
 * - Availability status
 */
export const GAME_MODES: GameMode[] = [
    {
        id: 'classic',
        name: 'Classic',
        icon: '🎲',
        description: 'Traditional Ludo rules with safe zones and blockades',
        features: ['4 Players', 'Safe Zones', 'Blockades', 'Bonus Turns'],
        rules: 'classicRules',
        available: true,
    },
    {
        id: 'fast',
        name: 'Fast Mode',
        icon: '⚡',
        description: 'Quick games with 2 tokens per player and faster movement',
        features: ['2 Tokens', 'Double Dice', 'No Blockades', '10min Games'],
        rules: 'fastRules',
        available: true,
    },
    {
        id: 'team',
        name: 'Team Play',
        icon: '👥',
        description: '2v2 team battles with shared victory',
        features: ['2v2 Teams', 'Shared Goal', 'Team Strategy', 'Voice Chat'],
        rules: 'teamRules',
        available: false,
    },
    {
        id: 'blitz',
        name: 'Blitz',
        icon: '💨',
        description: 'Ultra-fast 5-minute matches with special power-ups',
        features: ['5min Timer', 'Power-ups', '1 Token', 'Speed Boost'],
        rules: 'blitzRules',
        available: false,
    },
    {
        id: 'tournament',
        name: 'Tournament',
        icon: '🏆',
        description: 'Competitive ranked matches with ELO rating',
        features: ['Ranked', 'ELO System', 'Leaderboards', 'Rewards'],
        rules: 'tournamentRules',
        available: false,
    },
];

/**
 * Get game mode by ID
 * 
 * @param modeId - Game mode identifier
 * @returns Game mode configuration or undefined
 */
export function getGameMode(modeId: string): GameMode | undefined {
    return GAME_MODES.find((mode) => mode.id === modeId);
}

/**
 * Get all available game modes
 * 
 * @returns Array of available game modes
 */
export function getAvailableModes(): GameMode[] {
    return GAME_MODES.filter((mode) => mode.available);
}

/**
 * Check if a game mode is available
 * 
 * @param modeId - Game mode identifier
 * @returns True if mode is available
 */
export function isModeAvailable(modeId: string): boolean {
    const mode = getGameMode(modeId);
    return mode?.available ?? false;
}
