/**
 * TOKEN COMPONENT
 * 
 * Renders a single game token (piece) positioned on the grid.
 * Uses CSS grid placement for precise positioning.
 */

import React from 'react';
import './Token.css';

const Token = ({
    color,
    row,
    col,
    onClick,
    isHighlighted,
    isMoving,
    inYard
}) => {
    const className = [
        'token',
        `token-${color}`,
        isHighlighted && 'highlighted',
        isMoving && 'moving',
        inYard && 'in-yard',
        onClick && 'clickable'
    ].filter(Boolean).join(' ');

    return (
        <div
            className={className}
            style={{
                gridRow: row + 1,
                gridColumn: col + 1
            }}
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
