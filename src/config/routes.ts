/**
 * Route Configuration
 * 
 * Centralized route definitions for the GoLudo application.
 * All routes are defined here to ensure consistency across the app.
 * 
 * @see docs/URL_ROUTING_ANALYSIS.md for architecture details
 */

// ============================================
// PUBLIC ROUTES (Landing, Marketing)
// ============================================

export const ROUTES = {
    /** Landing page with stats and hero */
    LANDING: '/',

    /** Game browser / app dashboard */
    APP: '/app',

    /** Ludo game lobby (create/join) */
    LUDO_LOBBY: '/app/ludo',

    /** Local game setup (AI/Hot-seat) */
    LUDO_LOCAL: '/app/ludo/local',

    /** Active game room */
    GAME: '/game/:roomId',
} as const;

// ============================================
// ROUTE HELPERS
// ============================================

/**
 * Generate a game room URL with the given room ID
 * @param roomId - The unique room identifier
 * @returns The full route path
 */
export function gameRoute(roomId: string): string {
    return `/game/${roomId}`;
}

/**
 * Extract room ID from current URL path
 * @param path - The current URL path
 * @returns The room ID or null if not a game route
 */
export function extractRoomId(path: string): string | null {
    const match = path.match(/^\/game\/([a-zA-Z0-9-]+)$/);
    return match ? match[1] : null;
}

// ============================================
// SEO METADATA
// ============================================

export const ROUTE_META = {
    [ROUTES.LANDING]: {
        title: '$GOLudo - Play & Earn with Web3 Ludo',
        description: 'The ultimate Web3 Ludo experience. Play against friends, stake crypto, and win big!',
        index: true,
    },
    [ROUTES.APP]: {
        title: 'Games - $GOLudo',
        description: 'Browse and play crypto games. Stake, compete, and earn.',
        index: true,
    },
    [ROUTES.LUDO_LOBBY]: {
        title: 'Ludo Lobby - $GOLudo',
        description: 'Create or join a Ludo match. Play with friends or stake crypto.',
        index: true,
    },
    [ROUTES.LUDO_LOCAL]: {
        title: 'Local Play - $GOLudo',
        description: 'Play Ludo offline against AI or with friends on one device.',
        index: false,
    },
    [ROUTES.GAME]: {
        title: 'Game Room - $GOLudo',
        description: 'Active game session.',
        index: false, // Game rooms should not be indexed
    },
} as const;
