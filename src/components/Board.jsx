/**
 * GAME BOARD COMPONENT
 * 
 * Renders the 15x15 grid Ludo board with USA Standard layout:
 * - Colored bases in corners
 * - Cross-shaped path with safe zones
 * - Star markers on 8 safe positions
 * - Center goal area with crown
 */

import React from 'react';
import './Board.css';
import {
    GRID_SIZE,
    BOARD_LAYOUT
} from '../engine/constants';

const Board = ({ children, overlay, rotation = 0, activePlayer = 0, isGameOver = false }) => {
    // PERF (G-008 R4 / G-009): the 225 cell elements are fully STATIC now.
    // Active-player highlighting is driven purely via the .ap-<color> class
    // on .ludo-board (see Board.css) — the old useMemo rebuilt all 225 cells
    // (incl. crown + pseudo layers) on every turn change.
    const cells = React.useMemo(() => {
        const result = [];
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cellType = BOARD_LAYOUT[row][col];
                const cellClasses = getCellClasses(cellType, row, col);
                const isCenterCrown = row === 7 && col === 7;

                result.push(
                    <div
                        key={`${row}-${col}`}
                        className={`board-cell ${cellClasses}`}
                        data-row={row}
                        data-col={col}
                        style={{
                            gridRow: row + 1,
                            gridColumn: col + 1
                        }}
                    >
                        {isCenterCrown && (
                            <div className="crown-wrapper">
                                <span className="crown-icon">👑</span>
                            </div>
                        )}
                    </div>
                );
            }
        }
        return result;
    }, []);

    const activePlayerClass = ['ap-red', 'ap-green', 'ap-yellow', 'ap-blue'][activePlayer] || '';

    return (
        <div className="board-wrapper">
            <div className="board-focus-wrapper">
                <div className="board-anchor">
                    <div className={`ludo-board ${activePlayerClass}`} style={{
                        transform: `rotate(${rotation}deg)`,
                        transition: 'transform 0.5s ease',
                        '--board-rotation': `${rotation}deg`,
                        '--crown-rotation': `${[-45, 45, 135, 225][activePlayer] || 0}deg`
                    }}>
                        {cells}
                        <div className="token-layer" style={{ transform: `rotate(0deg)` }}>
                            {children}
                        </div>
                    </div>
                    {/* Overlay elements positioned relative to board */}
                    {overlay}
                </div>
            </div>
        </div>
    );
};

/**
 * Generate CSS class names for a cell based on its type and position.
 * NOTE: active-player highlighting (former .active-turn / .home-path-active
 * classes) moved to the .ap-<color> class on .ludo-board so cells stay static.
 */
function getCellClasses(cellType, row, col) {
    const classes = [cellType];

    // 1. Check for spawn points in bases
    const spawnPositions = {
        'base-red': [[1, 1], [1, 4], [4, 1], [4, 4]],
        'base-green': [[1, 10], [1, 13], [4, 10], [4, 13]],
        'base-yellow': [[10, 10], [10, 13], [13, 10], [13, 13]],
        'base-blue': [[10, 1], [10, 4], [13, 1], [13, 4]]
    };

    if (spawnPositions[cellType]) {
        const isSpawn = spawnPositions[cellType].some(([r, c]) => r === row && c === col);
        if (isSpawn) classes.push('spawn-point');
    }

    // 2. Base Detail: Edge vs Inner for refined active effects
    // Bases are 6x6 in corners
    const isBase = cellType.startsWith('base-');
    if (isBase) {
        const r0 = row < 6 ? 0 : 9;
        const c0 = col < 6 ? 0 : 9;
        const isEdge = row === r0 || row === r0 + 5 || col === c0 || col === c0 + 5;
        classes.push(isEdge ? 'base-edge' : 'base-inner');
    }

    return classes.join(' ');
}

export default React.memo(Board);
