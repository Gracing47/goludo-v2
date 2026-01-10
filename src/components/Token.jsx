/**
 * TOKEN COMPONENT
 * 
 * Renders a single game token with:
 * - 3D spherical appearance
 * - Stacking offset for multiple tokens on same cell
 * - Highlight animation for valid moves
 */

import React from 'react';
import './Token.css';

/**
 * Calculate stack offset for multiple tokens sharing a cell
 * @param {number} stackIndex - Token's position in the stack (0-3)
 * @param {number} stackSize - Total tokens in the stack
 * @returns {Object} - CSS transform values
 */
function getStackOffset(stackIndex, stackSize) {
    if (stackSize <= 1) {
        return { x: 0, y: 0, scale: 1 };
    }

    // Offset positions for stacked tokens
    const offsets = [
        { x: -20, y: -20 },  // Top-left
        { x: 20, y: -20 },   // Top-right
        { x: -20, y: 20 },   // Bottom-left
        { x: 20, y: 20 }     // Bottom-right
    ];

    const scale = stackSize === 2 ? 0.75 : 0.6;
    const offset = offsets[stackIndex % 4];

    return { ...offset, scale };
}

const Token = ({
    color,
    row,
    col,
    onClick,
    isHighlighted,
    isMoving,
    inYard,
    stackIndex = 0,
    stackSize = 1,
    rotation = 0
}) => {
    const offset = getStackOffset(stackIndex, stackSize);

    const className = [
        'token',
        `token-${color}`,
        isHighlighted && 'highlighted',
        isMoving && 'moving',
        inYard && 'in-yard',
        onClick && 'clickable',
        stackSize > 1 && 'stacked'
    ].filter(Boolean).join(' ');

    const style = {
        gridRow: row + 1,
        gridColumn: col + 1,
        '--stack-x': `${offset.x}%`,
        '--stack-y': `${offset.y}%`,
        '--stack-scale': offset.scale,
        '--token-rotation': `${rotation}deg`,
        zIndex: 10 + stackIndex
    };

    return (
        <div
            className={className}
            style={style}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={`${color} token`}
        >
            <div className="token-shine" />
        </div>
    );
};

export default Token;
