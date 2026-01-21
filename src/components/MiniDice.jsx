/**
 * MINI DICE COMPONENT
 * 
 * Small dice shown next to each player's avatar.
 * Only the active player's dice is interactive.
 */

import React from 'react';
import './MiniDice.css';

const MiniDice = ({ value, isActive, isRolling, onClick, disabled, color }) => {
    const canClick = isActive && !disabled && onClick;

    return (
        <button
            className={`mini-dice ${color} ${isActive ? 'active' : ''} ${isRolling ? 'rolling' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={canClick ? onClick : undefined}
            disabled={!canClick}
        >
            <div className={`mini-dice-cube show-${(value > 0 && value <= 6) ? value : 1}`}>
                <div className="mini-face face-1"><span className="mini-dot" /></div>
                <div className="mini-face face-2"><span className="mini-dot" /><span className="mini-dot" /></div>
                <div className="mini-face face-3"><span className="mini-dot" /><span className="mini-dot" /><span className="mini-dot" /></div>
                <div className="mini-face face-4"><span className="mini-dot" /><span className="mini-dot" /><span className="mini-dot" /><span className="mini-dot" /></div>
                <div className="mini-face face-5"><span className="mini-dot" /><span className="mini-dot" /><span className="mini-dot" /><span className="mini-dot" /><span className="mini-dot" /></div>
                <div className="mini-face face-6"><span className="mini-dot" /><span className="mini-dot" /><span className="mini-dot" /><span className="mini-dot" /><span className="mini-dot" /><span className="mini-dot" /></div>
            </div>
        </button>
    );
};

export default MiniDice;
