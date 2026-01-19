/**
 * GAME BOARD COMPONENT
 * 
 * Renders the 15x15 grid Ludo board with USA Standard layout:
 * - Colored bases in corners
 * - Cross-shaped path with safe zones
 * - Star markers on 8 safe positions
 * - Center goal area with crown
 */

import React, { useState, useEffect } from 'react';
import './Board.css';
import {
    GRID_SIZE,
    BOARD_LAYOUT,
    CELL_TYPE,
    MASTER_LOOP,
    HOME_STRETCH_COORDS,
    PLAYERS
} from '../engine/constants';

const Board = ({ children, rotation = 0, activePlayer = 0 }) => {
    // Calculate responsive board size - Mobile First
    const getBoardSize = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (vw < 768) return Math.min(vw - 24, vh * 0.6, 500);
        return Math.min(vw * 0.5, vh - 100, 600);
    };

    const [boardSize, setBoardSize] = useState(getBoardSize());

    useEffect(() => {
        const handleResize = () => setBoardSize(getBoardSize());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const cells = React.useMemo(() => {
        const result = [];
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const cellType = BOARD_LAYOUT[row][col];
                const cellClasses = getCellClasses(cellType, row, col, activePlayer);

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
                    />
                );
            }
        }
        return result;
    }, [activePlayer, rotation, boardSize]);

    return (
        <div className="board-wrapper">
            <div className="ludo-board" style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.5s ease',
                '--board-rotation': `${rotation}deg`,
                '--board-size': `${boardSize}px`
            }}>
                {cells}
                <div className="token-layer" style={{ transform: `rotate(0deg)` }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

/**
 * Generate CSS class names for a cell based on its type and position
 */
function getCellClasses(cellType, row, col, activePlayer) {
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

    // 3. Active Player Highlight
    const activeColor = ['base-red', 'base-green', 'base-yellow', 'base-blue'][activePlayer];
    if (cellType === activeColor) {
        classes.push('active-turn');
    }

    // 4. Home Stretch Highlight
    const homeStretch = HOME_STRETCH_COORDS[activePlayer];
    if (homeStretch) {
        const isHomePath = homeStretch.some(p => p.r === row && p.c === col);
        if (isHomePath) classes.push('home-path-active');
    }

    return classes.join(' ');
}

export default Board;
