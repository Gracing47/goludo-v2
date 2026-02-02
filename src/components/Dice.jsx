/**
 * 3D ANIMATED DICE COMPONENT
 * 
 * Renders a physically accurate dice with 3D rotation animation.
 * Uses CSS 3D transforms for realistic rolling effect.
 */

import React, { useState } from 'react';
import './Dice.css';

const Dice = ({ value, onRoll, disabled, isRolling }) => {
    return (
        <button
            className={`dice-button ${disabled ? 'disabled' : ''} ${isRolling ? 'rolling-container' : ''}`}
            onClick={onRoll}
            disabled={disabled}
        >
            <div className={`dice ${isRolling ? 'rolling' : ''} show-${(value > 0 && value <= 6) ? value : 1}`}>
                {/* Standard faces */}
                <div className="dice-face face-1"><span className="dot"></span></div>
                <div className="dice-face face-2"><span className="dot"></span><span className="dot"></span></div>
                <div className="dice-face face-3"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                <div className="dice-face face-4"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                <div className="dice-face face-5"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                <div className="dice-face face-6"><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
            </div>

            {/* Bonus value overlay */}
            {value > 6 && !isRolling && (
                <div className="dice-bonus-overlay">
                    +{value}
                </div>
            )}
        </button>
    );
};

export default React.memo(Dice);
