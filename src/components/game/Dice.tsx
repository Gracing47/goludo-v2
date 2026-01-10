/**
 * Dice Component
 * 
 * Interactive dice with rolling animation and dot patterns.
 * Displays 1-6 dots in traditional dice layout.
 * 
 * Features:
 * - Rolling animation
 * - Traditional dot patterns
 * - Player color border (optional)
 * - Disabled state
 * - 3D button effect
 * 
 * @example
 * ```tsx
 * <Dice 
 *   value={4}
 *   isRolling={false}
 *   onClick={handleRoll}
 *   playerColor="#ef4444"
 * />
 * ```
 */

import React from 'react';
import './Dice.css';

interface DiceProps {
    /** Dice value (1-6) */
    value: number;

    /** Whether dice is currently rolling */
    isRolling: boolean;

    /** Click handler for rolling */
    onClick: () => void;

    /** Whether dice is disabled */
    disabled?: boolean;

    /** Player color for border (optional) */
    playerColor?: string;
}

/**
 * Dice Component
 * 
 * Interactive dice with traditional dot patterns.
 */
export const Dice: React.FC<DiceProps> = ({
    value,
    isRolling,
    onClick,
    disabled,
    playerColor
}) => {
    // Render dots based on value
    const renderDots = () => {
        const dots = [];

        // Dot positions for each value
        const patterns: Record<number, number[]> = {
            1: [4], // center
            2: [0, 8], // top-left, bottom-right
            3: [0, 4, 8], // top-left, center, bottom-right
            4: [0, 2, 6, 8], // corners
            5: [0, 2, 4, 6, 8], // corners + center
            6: [0, 2, 3, 5, 6, 8], // two columns
        };

        const positions = patterns[value] || [];

        for (let i = 0; i < 9; i++) {
            if (positions.includes(i)) {
                dots.push(<span key={i} className="dice-dot" />);
            } else {
                dots.push(<span key={i} className="dice-dot-empty" />);
            }
        }

        return dots;
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled || isRolling}
            className={`dice ${isRolling ? 'rolling' : ''} ${disabled ? 'disabled' : ''}`}
            style={{ borderBottomColor: playerColor }}
        >
            <div className="dice-face">
                {renderDots()}
            </div>
        </button>
    );
};

export default Dice;
