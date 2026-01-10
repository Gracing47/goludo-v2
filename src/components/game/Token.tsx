/**
 * Token Component
 * 
 * Represents a game piece on the board.
 * Features 3D styling, color variants, and click interactions.
 * 
 * Features:
 * - Color-coded (red, green, yellow, blue)
 * - Clickable state with hover effects
 * - 3D appearance with highlights
 * - Pulse animation when selectable
 * 
 * @example
 * ```tsx
 * <Token 
 *   color="red"
 *   isClickable={true}
 *   onClick={() => moveToken(0)}
 * />
 * ```
 */

import React from 'react';
import type { PlayerColor } from '../../types';
import './Token.css';

interface TokenProps {
    /** Token color */
    color: PlayerColor;

    /** Whether token can be clicked */
    isClickable?: boolean;

    /** Click handler */
    onClick?: () => void;

    /** Additional CSS classes */
    className?: string;
}

/**
 * Token Component
 * 
 * Game piece with 3D styling and interactive states.
 */
export const Token: React.FC<TokenProps> = ({
    color,
    isClickable,
    onClick,
    className
}) => {
    return (
        <div
            onClick={isClickable ? onClick : undefined}
            className={`token token-${color} ${isClickable ? 'clickable' : ''} ${className || ''}`}
        >
            {/* Highlight for 3D effect */}
            <div className="token-highlight" />

            {/* Inner ring */}
            <div className="token-ring" />
        </div>
    );
};

export default Token;
