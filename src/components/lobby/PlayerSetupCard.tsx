/**
 * Player Setup Card Component
 * 
 * Configuration card for a single player.
 * Allows editing name, color, and type (human/AI).
 * 
 * Features:
 * - Name input
 * - Color picker integration
 * - Human/AI toggle
 * - Remove button (optional)
 * - Color-coded avatar
 * 
 * @example
 * ```tsx
 * <PlayerSetupCard
 *   player={player}
 *   index={0}
 *   takenColors={['green', 'blue']}
 *   onUpdate={(updates) => updatePlayer(player.id, updates)}
 *   onRemove={() => removePlayer(player.id)}
 *   canRemove={players.length > 2}
 * />
 * ```
 */

import React from 'react';
import type { Player, PlayerColor } from '../../types';
import { ColorPicker } from './ColorPicker';
import './PlayerSetupCard.css';

interface PlayerSetupCardProps {
  /** Player configuration */
  player: Player;
  
  /** Player index (0-3) for display */
  index: number;
  
  /** Colors taken by other players */
  takenColors: PlayerColor[];
  
  /** Callback for player updates */
  onUpdate: (updates: Partial<Player>) => void;
  
  /** Callback for removing player */
  onRemove?: () => void;
  
  /** Whether remove button should be shown */
  canRemove?: boolean;
}

/**
 * PlayerSetupCard Component
 * 
 * Interactive card for configuring a single player.
 */
export const PlayerSetupCard: React.FC<PlayerSetupCardProps> = ({
  player,
  index,
  takenColors,
  onUpdate,
  onRemove,
  canRemove
}) => {
  return (
    <div className="player-setup-card">
      
      {/* Avatar Badge */}
      <div className={`player-avatar avatar-${player.color}`}>
        P{index + 1}
      </div>

      {/* Inputs Section */}
      <div className="player-inputs">
        
        {/* Name Input */}
        <div className="input-group">
          <label className="input-label">Name</label>
          <input
            type="text"
            value={player.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="player-name-input"
            placeholder={`Player ${index + 1}`}
            maxLength={20}
          />
        </div>

        {/* Controls: Color & Type */}
        <div className="player-controls">
          <div className="control-group">
            <label className="input-label">Color</label>
            <ColorPicker 
              selectedColor={player.color} 
              takenColors={takenColors}
              onChange={(color) => onUpdate({ color })}
            />
          </div>

          {/* Toggle Human/AI */}
          <button
            onClick={() => onUpdate({ type: player.type === 'human' ? 'ai' : 'human' })}
            className={`type-toggle ${player.type === 'ai' ? 'ai-mode' : 'human-mode'}`}
            type="button"
          >
            {player.type === 'human' ? '👤 Human' : '🤖 AI'}
          </button>
        </div>
      </div>

      {/* Remove Button */}
      {canRemove && onRemove && (
        <button 
          onClick={onRemove}
          className="remove-btn"
          type="button"
          title="Remove player"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default PlayerSetupCard;
