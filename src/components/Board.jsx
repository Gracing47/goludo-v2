/**
 * GAME BOARD COMPONENT
 * 
 * Renders the 15x15 grid Ludo board with correct layout:
 * - RED base: top-left
 * - GREEN base: top-right
 * - BLUE base: bottom-left
 * - YELLOW base: bottom-right
 * - Cross-shaped path in middle
 * - Center goal area
 */

import React from 'react';
import './Board.css';
import { GRID_SIZE, BOARD_LAYOUT, CELL_TYPE } from '../engine/constants';

const Board = ({ children }) => {
    const cells = [];

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cellType = BOARD_LAYOUT[row][col];
            const cellClass = getCellClass(cellType, row, col);

            cells.push(
                <div
                    key={`${row}-${col}`}
                    className={`board-cell ${cellClass}`}
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

    return (
        <div className="board-wrapper">
            <div className="ludo-board">
                {cells}
                {/* Token layer renders on top */}
                <div className="token-layer">
                    {children}
                </div>
            </div>
        </div>
    );
};

/**
 * Maps cell type to CSS class names
 */
function getCellClass(cellType, row, col) {
    const classes = [cellType];

    // Add special markers for spawn positions in bases
    if (cellType === CELL_TYPE.BASE_RED) {
        if ((row === 1 || row === 4) && (col === 1 || col === 4)) {
            classes.push('spawn-point');
        }
    }
    if (cellType === CELL_TYPE.BASE_GREEN) {
        if ((row === 1 || row === 4) && (col === 10 || col === 13)) {
            classes.push('spawn-point');
        }
    }
    if (cellType === CELL_TYPE.BASE_YELLOW) {
        if ((row === 10 || row === 13) && (col === 10 || col === 13)) {
            classes.push('spawn-point');
        }
    }
    if (cellType === CELL_TYPE.BASE_BLUE) {
        if ((row === 10 || row === 13) && (col === 1 || col === 4)) {
            classes.push('spawn-point');
        }
    }

    return classes.join(' ');
}

export default Board;
