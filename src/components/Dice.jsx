/**
 * 3D ANIMATED DICE COMPONENT
 * 
 * Renders a physically accurate dice with 3D rotation animation.
 * Uses CSS 3D transforms for realistic rolling effect.
 */

import React, { useState } from 'react';
import './Dice.css';

const Dice = ({ value, onRoll, disabled, isRolling }) => {
    // Determine current game state for screen readers
    const getAriaLabel = () => {
        if (disabled) {
            return "Dice - Not your turn";
        }
        if (isRolling) {
            return "Dice is rolling";
        }
        if (value > 0) {
            return `Dice showing ${value}. Press Enter or Space to roll again`;
        }
        return "Roll dice. Press Enter or Space";
    };

    // Handle keyboard events
    const handleKeyDown = (e) => {
        if (disabled || isRolling) return;

        // Enter or Space to roll
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); // Prevent page scroll on Space
            onRoll?.();
        }
    };

    return (
        <button
            className={`dice-button ${disabled ? 'disabled' : ''} ${isRolling ? 'rolling-container' : ''}`}
            onClick={onRoll}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-label={getAriaLabel()}
            aria-disabled={disabled}
            aria-busy={isRolling}
            aria-live="polite"
            role="button"
            tabIndex={disabled ? -1 : 0}
        >
            <div className={`dice ${isRolling ? 'rolling' : ''} show-${(value > 0 && value <= 6) ? value : 1}`}>
                {/* Standard faces */}
                <div className="dice-face face-1" aria-hidden="true"><span className="dot"></span></div>
                <div className="dice-face face-2" aria-hidden="true"><span className="dot"></span><span className="dot"></span></div>
                <div className="dice-face face-3" aria-hidden="true"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                <div className="dice-face face-4" aria-hidden="true"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                <div className="dice-face face-5" aria-hidden="true"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                <div className="dice-face face-6" aria-hidden="true"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
            </div>

            {/* Bonus value overlay */}
            {value > 6 && !isRolling && (
                <div className="dice-bonus-overlay" aria-label={`Bonus move: ${value} steps`}>
                    +{value}
                </div>
            )}

            {/* Screen reader announcement for current value */}
            {value > 0 && !isRolling && (
                <span className="sr-only" aria-live="assertive">
                    Rolled {value > 6 ? `${value} (bonus move)` : value}
                </span>
            )}
        </button>
    );
};

export default React.memo(Dice);
