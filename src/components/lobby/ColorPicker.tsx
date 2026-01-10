/**
 * Color Picker Component
 * 
 * Allows selection of player colors with visual feedback.
 * Automatically disables colors that are already taken by other players.
 * 
 * Features:
 * - Visual color swatches
 * - Taken colors are grayed out
 * - Selected color has ring indicator
 * - Touch-optimized
 * 
 * @example
 * ```tsx
 * <ColorPicker 
 *   selectedColor="red"
 *   takenColors={['green', 'blue']}
 *   onChange={(color) => updatePlayer({ color })}
 * />
 * ```
 */

import React from 'react';
import type { PlayerColor } from '../../types';
import './ColorPicker.css';

interface ColorPickerProps {
    /** Currently selected color */
    selectedColor: PlayerColor;

    /** Colors already taken by other players */
    takenColors: PlayerColor[];

    /** Callback when color is changed */
    onChange: (color: PlayerColor) => void;
}

const COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

/**
 * ColorPicker Component
 * 
 * Interactive color selection with automatic conflict detection.
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
    selectedColor,
    takenColors,
    onChange
}) => {
    return (
        <div className="color-picker">
            {COLORS.map((color) => {
                const isTaken = takenColors.includes(color) && color !== selectedColor;
                const isSelected = color === selectedColor;

                return (
                    <button
                        key={color}
                        disabled={isTaken}
                        onClick={() => onChange(color)}
                        className={`color-swatch color-${color} ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''}`}
                        title={isTaken ? 'Already taken' : color}
                        type="button"
                    >
                        {isSelected && (
                            <span className="check-mark">✓</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default ColorPicker;
