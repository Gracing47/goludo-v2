/**
 * Game Mode Card Component
 * 
 * Displays a game mode with its features and availability.
 * Connects to the GameMode type from Phase 1.
 * 
 * Features:
 * - Visual feedback on hover
 * - Disabled state for unavailable modes
 * - Feature list display
 * - Click handler for mode selection
 * 
 * @example
 * ```tsx
 * <GameModeCard 
 *   mode={classicMode} 
 *   onClick={(id) => navigate(`/setup/${id}`)} 
 * />
 * ```
 */

import React from 'react';
import type { GameMode } from '../../types';
import './GameModeCard.css';

interface GameModeCardProps {
    /** Game mode configuration */
    mode: GameMode;

    /** Click handler - receives mode ID */
    onClick: (id: string) => void;
}

/**
 * GameModeCard Component
 * 
 * Interactive card for game mode selection.
 * Automatically handles available/unavailable states.
 */
export const GameModeCard: React.FC<GameModeCardProps> = ({ mode, onClick }) => {
    const handleClick = () => {
        if (mode.available) {
            onClick(mode.id);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`game-mode-card ${mode.available ? 'available' : 'unavailable'}`}
        >
            {/* Header */}
            <div className="card-header">
                <span className="card-icon">{mode.icon}</span>
                {!mode.available && (
                    <span className="coming-soon-badge">Soon</span>
                )}
            </div>

            {/* Title */}
            <h3 className="card-title">{mode.name}</h3>

            {/* Description */}
            <p className="card-description">{mode.description}</p>

            {/* Features */}
            <ul className="card-features">
                {mode.features.map((feature, idx) => (
                    <li key={idx} className="feature-item">
                        <span className="feature-dot" />
                        {feature}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default GameModeCard;
