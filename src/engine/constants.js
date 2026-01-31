/**
 * GAME CONSTANTS - GOLUDO ENGINE (USA STANDARD RULES)
 * 
 * Standard 15x15 Ludo Board - CORRECT PATH MAPPING
 * 
 * Visual representation (P = path, bases in corners):
 * 
 *     Col:  0   1   2   3   4   5   6   7   8   9  10  11  12  13  14
 *         ┌───────────────────────┬───────────┬───────────────────────┐
 *   Row 0 │ BR  BR  BR  BR  BR  BR│ P   P   P │ BG  BG  BG  BG  BG  BG│
 *   Row 1 │ BR  BR  BR  BR  BR  BR│ P   HG  SG│ BG  BG  BG  BG  BG  BG│
 *   Row 2 │ BR  BR  BR  BR  BR  BR│ S   HG  P │ BG  BG  BG  BG  BG  BG│
 *   Row 3 │ BR  BR  BR  BR  BR  BR│ P   HG  P │ BG  BG  BG  BG  BG  BG│
 *   Row 4 │ BR  BR  BR  BR  BR  BR│ P   HG  P │ BG  BG  BG  BG  BG  BG│
 *   Row 5 │ BR  BR  BR  BR  BR  BR│ P   HG  P │ BG  BG  BG  BG  BG  BG│
 *   Row 6 │ P   SR  P   P   P   P │ C   C   C │ P   P   P   P   S   P │
 *   Row 7 │ P   HR  HR  HR  HR  HR│ C   C   C │ HY  HY  HY  HY  HY  P │
 *   Row 8 │ P   S   P   P   P   P │ C   C   C │ P   P   P   P   SY  P │
 *   Row 9 │ BB  BB  BB  BB  BB  BB│ P   HB  P │ BY  BY  BY  BY  BY  BY│
 *   Row10 │ BB  BB  BB  BB  BB  BB│ P   HB  P │ BY  BY  BY  BY  BY  BY│
 *   Row11 │ BB  BB  BB  BB  BB  BB│ P   HB  P │ BY  BY  BY  BY  BY  BY│
 *   Row12 │ BB  BB  BB  BB  BB  BB│ P   HB  S │ BY  BY  BY  BY  BY  BY│
 *   Row13 │ BB  BB  BB  BB  BB  BB│ SB  HB  P │ BY  BY  BY  BY  BY  BY│
 *   Row14 │ BB  BB  BB  BB  BB  BB│ P   P   P │ BY  BY  BY  BY  BY  BY│
 *         └───────────────────────┴───────────┴───────────────────────┘
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
    BONUS_MOVE: 'BONUS_MOVE',
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
    ENTRY_ROLL: 6,
    BONUS_ON_SIX: true,
    TRIPLE_SIX_PENALTY: true,
    CAPTURE_BONUS: 20,
    HOME_BONUS: 10,
    EXACT_HOME_ENTRY: true,
    BLOCKADE_SIZE: 2,
    BLOCKADE_STRICT: false  // Disabled: tokens can pass each other freely
};

// ============================================
// CELL TYPES FOR BOARD RENDERING
// ============================================

export const CELL_TYPE = {
    EMPTY: 'empty',
    PATH: 'path',
    SAFE: 'safe',
    BASE_RED: 'base-red',
    BASE_GREEN: 'base-green',
    BASE_YELLOW: 'base-yellow',
    BASE_BLUE: 'base-blue',
    HOME_RED: 'home-red',
    HOME_GREEN: 'home-green',
    HOME_YELLOW: 'home-yellow',
    HOME_BLUE: 'home-blue',
    START_RED: 'start-red',
    START_GREEN: 'start-green',
    START_YELLOW: 'start-yellow',
    START_BLUE: 'start-blue',
    CENTER: 'center'
};

// ============================================
// BOARD MATRIX (15x15)
// ============================================

const E = CELL_TYPE.EMPTY;
const P = CELL_TYPE.PATH;
const S = CELL_TYPE.SAFE;
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
    //   0   1   2   3   4   5   6   7   8   9  10  11  12  13  14
    [BR, BR, BR, BR, BR, BR, P, P, P, BG, BG, BG, BG, BG, BG], // 0
    [BR, BR, BR, BR, BR, BR, P, HG, SG, BG, BG, BG, BG, BG, BG], // 1 - SG at (1,8)
    [BR, BR, BR, BR, BR, BR, S, HG, P, BG, BG, BG, BG, BG, BG], // 2 - S at (2,6)
    [BR, BR, BR, BR, BR, BR, P, HG, P, BG, BG, BG, BG, BG, BG], // 3
    [BR, BR, BR, BR, BR, BR, P, HG, P, BG, BG, BG, BG, BG, BG], // 4
    [BR, BR, BR, BR, BR, BR, P, HG, P, BG, BG, BG, BG, BG, BG], // 5
    [P, SR, P, P, P, P, C, C, C, P, P, P, S, P, P], // 6 - SR at (6,1), S at (6,12)
    [P, HR, HR, HR, HR, HR, C, C, C, HY, HY, HY, HY, HY, P], // 7
    [P, P, S, P, P, P, C, C, C, P, P, P, P, SY, P], // 8 - S at (8,2), SY at (8,13)
    [BB, BB, BB, BB, BB, BB, P, HB, P, BY, BY, BY, BY, BY, BY], // 9
    [BB, BB, BB, BB, BB, BB, P, HB, P, BY, BY, BY, BY, BY, BY], // 10
    [BB, BB, BB, BB, BB, BB, P, HB, P, BY, BY, BY, BY, BY, BY], // 11
    [BB, BB, BB, BB, BB, BB, P, HB, S, BY, BY, BY, BY, BY, BY], // 12 - S at (12,8)
    [BB, BB, BB, BB, BB, BB, SB, HB, P, BY, BY, BY, BY, BY, BY], // 13 - SB at (13,6)
    [BB, BB, BB, BB, BB, BB, P, P, P, BY, BY, BY, BY, BY, BY]  // 14
];

// ============================================
// MAIN PATH COORDINATES (52 positions, 0-51)
// Clockwise path starting at Red's entry point
// ============================================

export const MASTER_LOOP = [
    // --- RED SECTION (Positions 0-12) ---
    { r: 6, c: 1 },   // 0  - RED START ★
    { r: 6, c: 2 },   // 1
    { r: 6, c: 3 },   // 2
    { r: 6, c: 4 },   // 3
    { r: 6, c: 5 },   // 4
    { r: 5, c: 6 },   // 5  - Join top-vertical path
    { r: 4, c: 6 },   // 6
    { r: 3, c: 6 },   // 7
    { r: 2, c: 6 },   // 8  - Star ★
    { r: 1, c: 6 },   // 9
    { r: 0, c: 6 },   // 10
    { r: 0, c: 7 },   // 11 - Top-middle
    { r: 0, c: 8 },   // 12

    // --- GREEN SECTION (Positions 13-25) ---
    { r: 1, c: 8 },   // 13 - GREEN START ★
    { r: 2, c: 8 },   // 14
    { r: 3, c: 8 },   // 15
    { r: 4, c: 8 },   // 16
    { r: 5, c: 8 },   // 17
    { r: 6, c: 9 },   // 18 - Join right-horizontal path
    { r: 6, c: 10 },  // 19
    { r: 6, c: 11 },  // 20
    { r: 6, c: 12 },  // 21 - Star ★
    { r: 6, c: 13 },  // 22
    { r: 6, c: 14 },  // 23
    { r: 7, c: 14 },  // 24 - Right-middle
    { r: 8, c: 14 },  // 25

    // --- YELLOW SECTION (Positions 26-38) ---
    { r: 8, c: 13 },  // 26 - YELLOW START ★
    { r: 8, c: 12 },  // 27
    { r: 8, c: 11 },  // 28
    { r: 8, c: 10 },  // 29
    { r: 8, c: 9 },   // 30
    { r: 9, c: 8 },   // 31 - Join bottom-vertical path
    { r: 10, c: 8 },  // 32
    { r: 11, c: 8 },  // 33
    { r: 12, c: 8 },  // 34 - Star ★
    { r: 13, c: 8 },  // 35
    { r: 14, c: 8 },  // 36
    { r: 14, c: 7 },  // 37 - Bottom-middle
    { r: 14, c: 6 },  // 38

    // --- BLUE SECTION (Positions 39-51) ---
    { r: 13, c: 6 },  // 39 - BLUE START ★
    { r: 12, c: 6 },  // 40
    { r: 11, c: 6 },  // 41
    { r: 10, c: 6 },  // 42
    { r: 9, c: 6 },   // 43
    { r: 8, c: 5 },   // 44 - Join left-horizontal path
    { r: 8, c: 4 },   // 45
    { r: 8, c: 3 },   // 46
    { r: 8, c: 2 },   // 47 - Star ★
    { r: 8, c: 1 },   // 48
    { r: 8, c: 0 },   // 49
    { r: 7, c: 0 },   // 50 - Left-middle (Home Entry for Red)
    { r: 6, c: 0 }    // 51
];

// ============================================
// PLAYER PATH CONFIGURATION
// ============================================

export const PLAYER_START_POSITIONS = [
    0,   // RED starts at index 0 (6,1)
    13,  // GREEN starts at index 13 (1,8)
    26,  // YELLOW starts at index 26 (8,13)
    39   // BLUE starts at index 39 (13,6)
];

// Position index from which the player enters their home stretch
export const HOME_ENTRY_POSITIONS = [
    50,  // RED enters after index 50 (7,0)
    11,  // GREEN enters after index 11 (0,7)
    24,  // YELLOW enters after index 24 (7,14)
    37   // BLUE enters after index 37 (14,7)
];

// ============================================
// HARDCODED PLAYER PATHS
// ============================================

const generatePath = (startIdx, endIdxBeforeHome) => {
    let path = [];
    let current = startIdx;

    // Main path loop
    while (current !== (endIdxBeforeHome + 1) % 52) {
        path.push(current);
        current = (current + 1) % 52;
    }

    // Add Home Stretch (100-105)
    // Note: 105 is the goal
    for (let i = 0; i < 6; i++) {
        path.push(100 + i);
    }

    return path;
};

export const PLAYER_PATHS = {
    [PLAYERS.RED]: generatePath(0, 50),
    [PLAYERS.GREEN]: generatePath(13, 11),
    [PLAYERS.YELLOW]: generatePath(26, 24),
    [PLAYERS.BLUE]: generatePath(39, 37)
};

// ============================================
// SAFE ZONE POSITIONS (Indices in MASTER_LOOP)
// ============================================

export const SAFE_POSITIONS = [
    // Start positions
    0, 13, 26, 39,
    // Star positions (8 steps from start)
    8, 21, 34, 47
];

// ============================================
// HOME STRETCH COORDINATES (6 cells each)
// ============================================

export const HOME_STRETCH_COORDS = {
    [PLAYERS.RED]: [
        { r: 7, c: 1 },   // 100
        { r: 7, c: 2 },   // 101
        { r: 7, c: 3 },   // 102
        { r: 7, c: 4 },   // 103
        { r: 7, c: 5 },   // 104
        { r: 7, c: 6 }    // 105 - Goal
    ],
    [PLAYERS.GREEN]: [
        { r: 1, c: 7 },   // 100
        { r: 2, c: 7 },   // 101
        { r: 3, c: 7 },   // 102
        { r: 4, c: 7 },   // 103
        { r: 5, c: 7 },   // 104
        { r: 6, c: 7 }    // 105 - Goal
    ],
    [PLAYERS.YELLOW]: [
        { r: 7, c: 13 },  // 100
        { r: 7, c: 12 },  // 101
        { r: 7, c: 11 },  // 102
        { r: 7, c: 10 },  // 103
        { r: 7, c: 9 },   // 104
        { r: 7, c: 8 }    // 105 - Goal
    ],
    [PLAYERS.BLUE]: [
        { r: 13, c: 7 },  // 100
        { r: 12, c: 7 },  // 101
        { r: 11, c: 7 },  // 102
        { r: 10, c: 7 },  // 103
        { r: 9, c: 7 },   // 104
        { r: 8, c: 7 }    // 105 - Goal
    ]
};

// ============================================
// YARD SPAWN POSITIONS
// ============================================

export const YARD_COORDS = {
    [PLAYERS.RED]: [
        { r: 1, c: 1 }, { r: 1, c: 4 }, { r: 4, c: 1 }, { r: 4, c: 4 }
    ],
    [PLAYERS.GREEN]: [
        { r: 1, c: 10 }, { r: 1, c: 13 }, { r: 4, c: 10 }, { r: 4, c: 13 }
    ],
    [PLAYERS.YELLOW]: [
        { r: 10, c: 10 }, { r: 10, c: 13 }, { r: 13, c: 10 }, { r: 13, c: 13 }
    ],
    [PLAYERS.BLUE]: [
        { r: 10, c: 1 }, { r: 10, c: 4 }, { r: 13, c: 1 }, { r: 13, c: 4 }
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
