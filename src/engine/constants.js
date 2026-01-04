/**
 * GAME CONSTANTS - GOLUDO ENGINE (USA STANDARD RULES)
 * 
 * Standard USA Ludo / Parcheesi Rules:
 * - 8 Safe Zones (4 Start + 4 Star positions)
 * - Capture Bonus: +20 moves
 * - Home Bonus: +10 moves  
 * - Triple-6 Penalty: Turn forfeit
 * - Blockades: 2 same-color tokens block everyone
 * - Exact Throw: Must land exactly on goal
 * 
 * Board Layout (15x15 Grid):
 * ┌─────────┬───┬─────────┐
 * │ RED     │   │ GREEN   │
 * │ BASE    │ ↓ │ BASE    │
 * │ (0-5)   │   │ (9-14)  │
 * ├─────────┼───┼─────────┤
 * │ →       │ ⬛│ ←       │
 * ├─────────┼───┼─────────┤
 * │ BLUE    │   │ YELLOW  │
 * │ BASE    │ ↑ │ BASE    │
 * │ (0-5)   │   │ (9-14)  │
 * └─────────┴───┴─────────┘
 */

// ============================================
// GRID CONFIGURATION
// ============================================

export const GRID_SIZE = 15;

// ============================================
// PLAYER CONFIGURATION
// ============================================

export const PLAYERS = {
    RED: 0,
    GREEN: 1,
    YELLOW: 2,
    BLUE: 3
};

export const PLAYER_COLORS = ['red', 'green', 'yellow', 'blue'];
export const PLAYER_NAMES = ['Red', 'Green', 'Yellow', 'Blue'];
export const TOKENS_PER_PLAYER = 4;

// ============================================
// GAME STATES
// ============================================

export const GAME_PHASE = {
    ROLL_DICE: 'ROLL_DICE',
    SELECT_TOKEN: 'SELECT_TOKEN',
    BONUS_MOVE: 'BONUS_MOVE',      // After capture or home
    MOVING: 'MOVING',
    WIN: 'WIN'
};

// ============================================
// SPECIAL POSITIONS
// ============================================

export const POSITION = {
    IN_YARD: -1,
    FINISHED: 999
};

export const MAIN_PATH_LENGTH = 52;
export const HOME_STRETCH_START = 100;
export const HOME_STRETCH_LENGTH = 6;

// ============================================
// USA STANDARD RULE CONFIGURATION
// ============================================

export const RULES = {
    ENTRY_ROLL: 6,              // Need this to leave yard
    BONUS_ON_SIX: true,         // Extra roll on 6
    TRIPLE_SIX_PENALTY: true,   // 3x6 = forfeit turn
    CAPTURE_BONUS: 20,          // +20 moves after capture
    HOME_BONUS: 10,             // +10 moves after reaching goal
    EXACT_HOME_ENTRY: true,     // Must land exactly on goal
    BLOCKADE_SIZE: 2,           // 2 tokens = blockade
    BLOCKADE_STRICT: true       // No one can pass blockade
};

// ============================================
// CELL TYPES FOR BOARD RENDERING
// ============================================

export const CELL_TYPE = {
    EMPTY: 'empty',
    PATH: 'path',
    SAFE: 'safe',               // Star safe zones
    BASE_RED: 'base-red',
    BASE_GREEN: 'base-green',
    BASE_YELLOW: 'base-yellow',
    BASE_BLUE: 'base-blue',
    HOME_RED: 'home-red',
    HOME_GREEN: 'home-green',
    HOME_YELLOW: 'home-yellow',
    HOME_BLUE: 'home-blue',
    START_RED: 'start-red',     // Entry point (also safe)
    START_GREEN: 'start-green',
    START_YELLOW: 'start-yellow',
    START_BLUE: 'start-blue',
    CENTER: 'center'
};

// ============================================
// BOARD MATRIX (15x15) - Visual Layout
// ============================================

const E = CELL_TYPE.EMPTY;
const P = CELL_TYPE.PATH;
const S = CELL_TYPE.SAFE;       // Star safe zone
const C = CELL_TYPE.CENTER;
const BR = CELL_TYPE.BASE_RED;
const BG = CELL_TYPE.BASE_GREEN;
const BY = CELL_TYPE.BASE_YELLOW;
const BB = CELL_TYPE.BASE_BLUE;
const HR = CELL_TYPE.HOME_RED;
const HG = CELL_TYPE.HOME_GREEN;
const HY = CELL_TYPE.HOME_YELLOW;
const HB = CELL_TYPE.HOME_BLUE;
const SR = CELL_TYPE.START_RED;
const SG = CELL_TYPE.START_GREEN;
const SY = CELL_TYPE.START_YELLOW;
const SB = CELL_TYPE.START_BLUE;

export const BOARD_LAYOUT = [
    // Row 0:  RED BASE area + path + GREEN BASE area
    [BR, BR, BR, BR, BR, BR, P, SG, P, BG, BG, BG, BG, BG, BG],
    // Row 1
    [BR, BR, BR, BR, BR, BR, S, HG, P, BG, BG, BG, BG, BG, BG],
    // Row 2  
    [BR, BR, BR, BR, BR, BR, P, HG, P, BG, BG, BG, BG, BG, BG],
    // Row 3
    [BR, BR, BR, BR, BR, BR, P, HG, P, BG, BG, BG, BG, BG, BG],
    // Row 4
    [BR, BR, BR, BR, BR, BR, P, HG, P, BG, BG, BG, BG, BG, BG],
    // Row 5
    [BR, BR, BR, BR, BR, BR, P, HG, P, BG, BG, BG, BG, BG, BG],
    // Row 6 - Horizontal path (top)
    [P, SR, P, P, P, P, C, C, C, P, P, P, P, S, P],
    // Row 7 - Center row with home stretches
    [P, HR, HR, HR, HR, HR, C, C, C, HY, HY, HY, HY, HY, P],
    // Row 8 - Horizontal path (bottom)
    [P, S, P, P, P, P, C, C, C, P, P, P, P, SY, P],
    // Row 9
    [BB, BB, BB, BB, BB, BB, P, HB, P, BY, BY, BY, BY, BY, BY],
    // Row 10
    [BB, BB, BB, BB, BB, BB, P, HB, P, BY, BY, BY, BY, BY, BY],
    // Row 11
    [BB, BB, BB, BB, BB, BB, P, HB, P, BY, BY, BY, BY, BY, BY],
    // Row 12
    [BB, BB, BB, BB, BB, BB, P, HB, P, BY, BY, BY, BY, BY, BY],
    // Row 13
    [BB, BB, BB, BB, BB, BB, P, HB, S, BY, BY, BY, BY, BY, BY],
    // Row 14
    [BB, BB, BB, BB, BB, BB, P, SB, P, BY, BY, BY, BY, BY, BY]
];

// ============================================
// MAIN PATH COORDINATES (52 positions, 0-51)
// Clockwise movement: Red → Green → Yellow → Blue → Red
// ============================================

export const MASTER_LOOP = [
    // Starting from RED's entry, going UP then RIGHT
    { r: 6, c: 1 },   // 0 - RED START ★ (Safe)
    { r: 5, c: 0 },   // 1
    { r: 4, c: 0 },   // 2
    { r: 3, c: 0 },   // 3
    { r: 2, c: 0 },   // 4
    { r: 1, c: 0 },   // 5
    { r: 0, c: 0 },   // 6
    { r: 0, c: 1 },   // 7
    { r: 0, c: 2 },   // 8
    { r: 0, c: 3 },   // 9
    { r: 0, c: 4 },   // 10
    { r: 0, c: 5 },   // 11
    { r: 0, c: 6 },   // 12

    // GREEN section
    { r: 0, c: 7 },   // 13 - GREEN START ★ (Safe)
    { r: 0, c: 8 },   // 14
    { r: 0, c: 9 },   // 15
    { r: 0, c: 10 },  // 16
    { r: 0, c: 11 },  // 17
    { r: 0, c: 12 },  // 18
    { r: 0, c: 13 },  // 19
    { r: 0, c: 14 },  // 20
    { r: 1, c: 14 },  // 21
    { r: 2, c: 14 },  // 22
    { r: 3, c: 14 },  // 23
    { r: 4, c: 14 },  // 24
    { r: 5, c: 14 },  // 25

    // YELLOW section  
    { r: 6, c: 14 },  // 26 - Star ★ (Safe)
    { r: 6, c: 13 },  // 27
    { r: 7, c: 14 },  // 28
    { r: 8, c: 14 },  // 29
    { r: 8, c: 13 },  // 30 - YELLOW START ★ (Safe)
    { r: 9, c: 14 },  // 31
    { r: 10, c: 14 }, // 32
    { r: 11, c: 14 }, // 33
    { r: 12, c: 14 }, // 34
    { r: 13, c: 14 }, // 35
    { r: 14, c: 14 }, // 36
    { r: 14, c: 13 }, // 37
    { r: 14, c: 12 }, // 38
    { r: 14, c: 11 }, // 39
    { r: 14, c: 10 }, // 40
    { r: 14, c: 9 },  // 41
    { r: 14, c: 8 },  // 42

    // BLUE section
    { r: 14, c: 7 },  // 43 - BLUE START ★ (Safe)
    { r: 14, c: 6 },  // 44
    { r: 14, c: 5 },  // 45
    { r: 14, c: 4 },  // 46
    { r: 14, c: 3 },  // 47
    { r: 14, c: 2 },  // 48
    { r: 14, c: 1 },  // 49
    { r: 14, c: 0 },  // 50
    { r: 13, c: 0 },  // 51 - Star ★ (Safe)
    // ... continues to position 0
];

// ============================================
// PLAYER PATH CONFIGURATION
// Each player enters and exits the main loop at different points
// ============================================

export const PLAYER_START_POSITIONS = [
    0,   // RED starts at index 0
    13,  // GREEN starts at index 13
    30,  // YELLOW starts at index 30
    43   // BLUE starts at index 43
];

// Position where player enters home stretch (just before their start)
export const HOME_ENTRY_POSITIONS = [
    51,  // RED enters home after position 51
    12,  // GREEN enters home after position 12
    29,  // YELLOW enters home after position 29
    42   // BLUE enters home after position 42
];

// ============================================
// SAFE ZONE POSITIONS (Main Path Indices)
// 4 Start positions + 4 Star positions = 8 total
// ============================================

export const SAFE_POSITIONS = [
    // Start positions (colored entry points)
    0,   // Red start
    13,  // Green start
    30,  // Yellow start
    43,  // Blue start

    // Star positions (8 steps from each start)
    8,   // Star near Red (8 steps clockwise from Red start)
    21,  // Star near Green
    38,  // Star near Yellow
    51   // Star near Blue
];

// ============================================
// HOME STRETCH COORDINATES (6 cells each)
// Position 100-105 for each player
// ============================================

export const HOME_STRETCH_COORDS = {
    [PLAYERS.RED]: [
        { r: 7, c: 1 },   // 100
        { r: 7, c: 2 },   // 101
        { r: 7, c: 3 },   // 102
        { r: 7, c: 4 },   // 103
        { r: 7, c: 5 },   // 104
        { r: 7, c: 6 }    // 105 - Goal (center)
    ],
    [PLAYERS.GREEN]: [
        { r: 1, c: 7 },   // 100
        { r: 2, c: 7 },   // 101
        { r: 3, c: 7 },   // 102
        { r: 4, c: 7 },   // 103
        { r: 5, c: 7 },   // 104
        { r: 6, c: 7 }    // 105 - Goal (center)
    ],
    [PLAYERS.YELLOW]: [
        { r: 7, c: 13 },  // 100
        { r: 7, c: 12 },  // 101
        { r: 7, c: 11 },  // 102
        { r: 7, c: 10 },  // 103
        { r: 7, c: 9 },   // 104
        { r: 7, c: 8 }    // 105 - Goal (center)
    ],
    [PLAYERS.BLUE]: [
        { r: 13, c: 7 },  // 100
        { r: 12, c: 7 },  // 101
        { r: 11, c: 7 },  // 102
        { r: 10, c: 7 },  // 103
        { r: 9, c: 7 },   // 104
        { r: 8, c: 7 }    // 105 - Goal (center)
    ]
};

// ============================================
// YARD (BASE) TOKEN SPAWN POSITIONS
// ============================================

export const YARD_COORDS = {
    [PLAYERS.RED]: [
        { r: 1, c: 1 },
        { r: 1, c: 4 },
        { r: 4, c: 1 },
        { r: 4, c: 4 }
    ],
    [PLAYERS.GREEN]: [
        { r: 1, c: 10 },
        { r: 1, c: 13 },
        { r: 4, c: 10 },
        { r: 4, c: 13 }
    ],
    [PLAYERS.YELLOW]: [
        { r: 10, c: 10 },
        { r: 10, c: 13 },
        { r: 13, c: 10 },
        { r: 13, c: 13 }
    ],
    [PLAYERS.BLUE]: [
        { r: 10, c: 1 },
        { r: 10, c: 4 },
        { r: 13, c: 1 },
        { r: 13, c: 4 }
    ]
};

// ============================================
// DICE CONFIGURATION
// ============================================

export const DICE = {
    MIN: 1,
    MAX: 6,
    SPECIAL_ROLL: 6
};
