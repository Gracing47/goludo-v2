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
        <div className="dice-container">
            <button
                className={`dice-roll-button ${disabled ? 'disabled' : ''}`}
                onClick={onRoll}
                disabled={disabled}
            >
                <div className={`dice ${isRolling ? 'rolling' : ''} show-${value || 1}`}>
                    <div className="dice-face face-1">
                        <span className="dot"></span>
                    </div>
                    <div className="dice-face face-2">
                        <span className="dot"></span>
                        <span className="dot"></span>
                    </div>
                    <div className="dice-face face-3">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                    </div>
                    <div className="dice-face face-4">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                    </div>
                    <div className="dice-face face-5">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                    </div>
                    <div className="dice-face face-6">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                    </div>
                </div>
            </button>

            {value && !disabled && (
                <div className="dice-result">
                    Rolled: {value}
                </div>
            )}
        </div>
    );
};

export default Dice;
