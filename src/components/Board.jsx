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
    const [showDebug, setShowDebug] = useState(false);

    // Toggle debug with 'D' key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'd' || e.key === 'D') {
                setShowDebug(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Calculate responsive board size - Mobile First
    const getBoardSize = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Mobile portrait: Use most of width
        if (vw < 768) {
            return Math.min(vw - 24, vh * 0.6, 500);
        }

        // Tablet/Desktop: Balance with sidebar
        return Math.min(vw * 0.5, vh - 100, 600);
    };

    const [boardSize, setBoardSize] = useState(getBoardSize());

    useEffect(() => {
        const handleResize = () => setBoardSize(getBoardSize());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const cells = [];

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cellType = BOARD_LAYOUT[row][col];
            const cellClasses = getCellClasses(cellType, row, col, activePlayer);

            // Debug Info
            let debugLabel = null;
            if (showDebug) {
                // Check Main Loop
                const loopIndex = MASTER_LOOP.findIndex(p => p.r === row && p.c === col);
                if (loopIndex !== -1) {
                    debugLabel = loopIndex;
                } else {
                    // Check Home Stretches
                    Object.keys(PLAYERS).forEach(key => {
                        const pId = PLAYERS[key];
                        const stretch = HOME_STRETCH_COORDS[pId];
                        if (stretch) {
                            const sIdx = stretch.findIndex(p => p.r === row && p.c === col);
                            if (sIdx !== -1) debugLabel = `H${pId}-${sIdx}`;
                        }
                    });
                }
            }

            cells.push(
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
                    {debugLabel !== null && (
                        <span className="debug-label">{debugLabel}</span>
                    )}
                </div>
            );
        }
    }

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
            {showDebug && <div className="debug-alert">DEBUG MODE: ON (Nums = Path Index)</div>}
        </div>
    );
};

/**
 * Generate CSS class names for a cell based on its type and position
 */
function getCellClasses(cellType, row, col, activePlayer) {
    const classes = [cellType];

    // Check for spawn points in bases
    const spawnPositions = {
        'base-red': [[1, 1], [1, 4], [4, 1], [4, 4]],
        'base-green': [[1, 10], [1, 13], [4, 10], [4, 13]],
        'base-yellow': [[10, 10], [10, 13], [13, 10], [13, 13]],
        'base-blue': [[10, 1], [10, 4], [13, 1], [13, 4]]
    };

    if (spawnPositions[cellType]) {
        const isSpawn = spawnPositions[cellType].some(
            ([r, c]) => r === row && c === col
        );
        if (isSpawn) {
            classes.push('spawn-point');
        }
    }

    // Active Base Glow
    if (activePlayer === 0 && cellType === 'base-red') classes.push('active-turn');
    if (activePlayer === 1 && cellType === 'base-green') classes.push('active-turn');
    if (activePlayer === 2 && cellType === 'base-yellow') classes.push('active-turn');
    if (activePlayer === 3 && cellType === 'base-blue') classes.push('active-turn');

    // Home Stretch Highlight
    const homeStretch = HOME_STRETCH_COORDS[activePlayer];
    if (homeStretch) {
        const isHomePath = homeStretch.some(p => p.r === row && p.c === col);
        if (isHomePath) {
            classes.push('home-path-active');
        }
    }

    return classes.join(' ');
}

export default Board;
