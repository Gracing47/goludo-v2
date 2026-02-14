/**
 * Board Map - Coordinate Lookup Tables (FIXED)
 * 
 * Maps logical game positions to visual grid coordinates.
 * Uses a 15x15 grid system for the Ludo board.
 * 
 * Position System:
 * - 'IN_YARD' or -1: In yard (base)
 * - 0-51: On main path (52 cells total)
 * - 52-57: In home stretch (6 cells to center)
 * - 'FINISHED' or 58+: Finished (center)
 */

export interface Coordinates {
    x: number;
    y: number;
}

/**
 * Main path coordinates (52 cells)
 * Starts from position 0, goes clockwise around the board
 */
export const PATH_COORDINATES: Coordinates[] = [
    // Segment 1: Left side going up (0-5)
    { x: 0, y: 6 },
    { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },

    // Segment 2: Turn up (6-11)
    { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },

    // Segment 3: Top middle (12)
    { x: 7, y: 0 },

    // Segment 4: Turn down (13-18)
    { x: 8, y: 0 }, { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },

    // Segment 5: Right side going right (19-24)
    { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },

    // Segment 6: Right middle (25)
    { x: 14, y: 7 },

    // Segment 7: Turn left (26-31)
    { x: 14, y: 8 }, { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },

    // Segment 8: Turn down (32-37)
    { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },

    // Segment 9: Bottom middle (38)
    { x: 7, y: 14 },

    // Segment 10: Turn up (39-44)
    { x: 6, y: 14 }, { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },

    // Segment 11: Turn left (45-51)
    { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },

    // Wraps back to 0
    { x: 0, y: 7 }
];

/**
 * Yard (base) coordinates for each player
 * [playerIndex][tokenIndex] -> coordinates
 */
export const YARD_COORDINATES: Coordinates[][] = [
    // Red Yard (Top Left)
    [
        { x: 1, y: 1 },
        { x: 4, y: 1 },
        { x: 1, y: 4 },
        { x: 4, y: 4 }
    ],

    // Green Yard (Top Right)
    [
        { x: 10, y: 1 },
        { x: 13, y: 1 },
        { x: 10, y: 4 },
        { x: 13, y: 4 }
    ],

    // Yellow Yard (Bottom Left)
    [
        { x: 1, y: 10 },
        { x: 4, y: 10 },
        { x: 1, y: 13 },
        { x: 4, y: 13 }
    ],

    // Blue Yard (Bottom Right)
    [
        { x: 10, y: 10 },
        { x: 13, y: 10 },
        { x: 10, y: 13 },
        { x: 13, y: 13 }
    ]
];

/**
 * Home stretch coordinates (path to center)
 * [playerIndex][homePosition] -> coordinates
 */
export const HOME_COORDINATES: Coordinates[][] = [
    // Red Home (vertical up to center)
    [
        { x: 7, y: 6 },
        { x: 7, y: 5 },
        { x: 7, y: 4 },
        { x: 7, y: 3 },
        { x: 7, y: 2 },
        { x: 7, y: 1 }
    ],

    // Green Home (horizontal left to center)
    [
        { x: 8, y: 7 },
        { x: 9, y: 7 },
        { x: 10, y: 7 },
        { x: 11, y: 7 },
        { x: 12, y: 7 },
        { x: 13, y: 7 }
    ],

    // Yellow Home (vertical down to center)
    [
        { x: 7, y: 8 },
        { x: 7, y: 9 },
        { x: 7, y: 10 },
        { x: 7, y: 11 },
        { x: 7, y: 12 },
        { x: 7, y: 13 }
    ],

    // Blue Home (horizontal right to center)
    [
        { x: 6, y: 7 },
        { x: 5, y: 7 },
        { x: 4, y: 7 },
        { x: 3, y: 7 },
        { x: 2, y: 7 },
        { x: 1, y: 7 }
    ]
];

/**
 * Center/finish position
 */
export const CENTER_COORDINATES: Coordinates = { x: 7, y: 7 };

/**
 * Starting positions for each player on the main path
 * Red: 0, Green: 13, Yellow: 26, Blue: 39
 */
export const PLAYER_START_OFFSETS = [0, 13, 26, 39];

/**
 * Get grid coordinates for a token
 * 
 * @param playerIndex - Player index (0-3)
 * @param tokenIndex - Token index (0-3)
 * @param position - Token position
 * @returns Grid coordinates or null if invalid
 */
export function getTokenCoordinates(
    playerIndex: number,
    tokenIndex: number,
    position: number | string
): Coordinates | null {
    // Validate inputs
    if (playerIndex < 0 || playerIndex > 3) return null;
    if (tokenIndex < 0 || tokenIndex > 3) return null;

    // Handle string positions
    if (position === 'IN_YARD' || position === -1) {
        return YARD_COORDINATES[playerIndex]?.[tokenIndex] || null;
    }

    if (position === 'FINISHED') {
        return CENTER_COORDINATES;
    }

    // Convert to number
    const pos = typeof position === 'number' ? position : parseInt(position, 10);

    if (isNaN(pos)) {
        return null;
    }

    // Yard
    if (pos < 0) {
        return YARD_COORDINATES[playerIndex]?.[tokenIndex] || null;
    }

    // Main path (0-51)
    if (pos >= 0 && pos < 52) {
        // Each player starts at a different offset
        const startOffset = PLAYER_START_OFFSETS[playerIndex];
        const globalIndex = (pos + startOffset) % 52;
        return PATH_COORDINATES[globalIndex] || null;
    }

    // Home stretch (52-57)
    if (pos >= 52 && pos < 58) {
        const homeIndex = pos - 52;
        return HOME_COORDINATES[playerIndex]?.[homeIndex] || null;
    }

    // Finished (58+)
    if (pos >= 58) {
        return CENTER_COORDINATES;
    }

    return null;
}

/**
 * Check if a position is a safe zone
 */
export function isSafeZone(x: number, y: number): boolean {
    const safeZones = [
        { x: 1, y: 6 },   // Red start
        { x: 9, y: 6 },   // Green start  
        { x: 8, y: 1 },   // Top safe
        { x: 14, y: 8 },  // Right safe
        { x: 6, y: 13 },  // Bottom safe
        { x: 0, y: 6 },   // Left safe
    ];

    return safeZones.some(zone => zone.x === x && zone.y === y);
}
