/**
 * Board Component - State-Driven Rendering
 * 
 * The main game board using a 15x15 CSS Grid.
 * Renders cells, safe zones, bases, and tokens based on game state.
 * 
 * Features:
 * - 15x15 grid layout
 * - Color-coded zones
 * - Token positioning from store
 * - Multiple tokens per cell (stacking)
 * - Responsive sizing
 */

import React, { useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { getTokenCoordinates } from '../../engine/boardMap';
import { Token } from './Token';
import type { PlayerColor } from '../../types';
import './Board.css';

// Player colors in order
const PLAYER_COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

// 15x15 Grid = 225 cells
const TOTAL_CELLS = 15 * 15;
const CELLS = Array.from({ length: TOTAL_CELLS });

/**
 * Get cell type based on coordinates
 */
const getCellType = (x: number, y: number): string => {
    // Center (7,7)
    if (x === 7 && y === 7) return 'center';

    // Bases (corners)
    if (x < 6 && y < 6) return 'base-red';
    if (x > 8 && y < 6) return 'base-green';
    if (x < 6 && y > 8) return 'base-yellow';
    if (x > 8 && y > 8) return 'base-blue';

    // Home stretches (colored paths to center)
    if (x === 7 && y >= 1 && y < 6) return 'home-red';
    if (x >= 9 && x < 14 && y === 7) return 'home-green';
    if (x === 7 && y >= 9 && y < 14) return 'home-yellow';
    if (x >= 1 && x < 6 && y === 7) return 'home-blue';

    // Main path (white cells)
    // Vertical paths
    if (x === 6 && (y < 6 || y > 8)) return 'path';
    if (x === 7 && (y === 0 || y === 6 || y === 8 || y === 14)) return 'path';
    if (x === 8 && (y < 6 || y > 8)) return 'path';

    // Horizontal paths
    if (y === 6 && (x < 6 || x > 8)) return 'path';
    if (y === 7 && (x === 0 || x === 6 || x === 8 || x === 14)) return 'path';
    if (y === 8 && (x < 6 || x > 8)) return 'path';

    return 'empty';
};

interface TokenInfo {
    playerIndex: number;
    tokenIndex: number;
    color: PlayerColor;
}

/**
 * Board Component
 * 
 * Main game board with state-driven token rendering.
 */
export const Board: React.FC = () => {
    // Get game state from store
    const gameState = useGameStore((state) => state.state);

    // Build a map of cell coordinates to tokens
    const cellContentMap = useMemo(() => {
        const map = new Map<string, TokenInfo[]>();

        if (!gameState?.tokens) {
            return map;
        }

        // Iterate through all players and their tokens
        gameState.tokens.forEach((playerTokens, playerIndex) => {
            playerTokens.forEach((position, tokenIndex) => {
                const coords = getTokenCoordinates(playerIndex, tokenIndex, position);

                if (coords) {
                    const key = `${coords.x},${coords.y}`;

                    if (!map.has(key)) {
                        map.set(key, []);
                    }

                    map.get(key)!.push({
                        playerIndex,
                        tokenIndex,
                        color: PLAYER_COLORS[playerIndex]
                    });
                }
            });
        });

        return map;
    }, [gameState?.tokens]);

    return (
        <div className="board-container">
            <div className="board-grid">
                {CELLS.map((_, index) => {
                    const x = index % 15;
                    const y = Math.floor(index / 15);
                    const cellType = getCellType(x, y);
                    const cellKey = `${x},${y}`;
                    const tokensOnCell = cellContentMap.get(cellKey) || [];

                    return (
                        <div
                            key={index}
                            className={`board-cell cell-${cellType}`}
                            data-coords={cellKey}
                        >
                            {/* Render tokens if any */}
                            {tokensOnCell.length > 0 && (
                                <div className={`token-container ${tokensOnCell.length > 1 ? 'stacked' : ''}`}>
                                    {tokensOnCell.map((tokenInfo) => (
                                        <Token
                                            key={`${tokenInfo.playerIndex}-${tokenInfo.tokenIndex}`}
                                            color={tokenInfo.color}
                                            isClickable={false} // Will be dynamic based on valid moves
                                            onClick={() => console.log(`Token P${tokenInfo.playerIndex} T${tokenInfo.tokenIndex}`)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Debug coordinates (only in dev mode when cell is empty) */}
                            {import.meta.env.DEV && tokensOnCell.length === 0 && (
                                <span className="cell-debug">{x},{y}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Board;
