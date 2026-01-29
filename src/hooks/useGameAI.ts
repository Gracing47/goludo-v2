import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/shallow';
import { calculateAIMove } from '../engine/aiEngine';
import { Move } from '../types';

/**
 * useGameAI Hook
 * 
 * Manages AI turn logic. Listens for game state transitions where it's 
 * an AI's turn and triggers the appropriate actions with natural delays.
 */
export const useGameAI = (handleRoll: () => void, executeMove: (move: Move) => void) => {
    const {
        gameState,
        gameConfig,
        appState,
        isRolling,
        isMoving,
    } = useGameStore(useShallow((s) => ({
        gameState: s.state,
        gameConfig: s.config,
        appState: s.appState,
        isRolling: s.isRolling,
        isMoving: s.isMoving,
    })));

    const aiActionInProgress = useRef(false);

    useEffect(() => {
        // Only run when it's an AI player's turn in an active game
        if (!gameState || !gameConfig || appState !== 'game') return;

        // Don't act if animations are in progress
        if (isRolling || isMoving) return;

        // Prevent double actions
        if (aiActionInProgress.current) return;

        // Type narrowing for phase
        const phase = gameState.gamePhase;

        // Stop if game is won or animations/other states are in progress
        if (phase === 'WIN' || phase === 'ANIMATING') return;

        const currentPlayer = gameConfig.players[gameState.activePlayer];
        const isAI = currentPlayer?.type === 'ai' || (currentPlayer as any)?.isAI;
        if (!isAI) return;

        aiActionInProgress.current = true;

        switch (phase) {
            case 'ROLL_DICE': {
                const delay = 800 + Math.random() * 500;
                const timer = setTimeout(() => {
                    handleRoll();
                }, delay);
                return () => {
                    clearTimeout(timer);
                    aiActionInProgress.current = false;
                };
            }

            case 'SELECT_TOKEN':
            case 'BONUS_MOVE': {
                if (gameState.validMoves.length > 0) {
                    const delay = 500 + Math.random() * 500;
                    const timer = setTimeout(() => {
                        const bestMove = calculateAIMove(gameState);
                        if (bestMove) {
                            executeMove(bestMove);
                        } else {
                            aiActionInProgress.current = false;
                        }
                    }, delay);

                    return () => {
                        clearTimeout(timer);
                        aiActionInProgress.current = false;
                    };
                } else {
                    // Phase is SELECT_TOKEN/BONUS_MOVE but no moves (should be handled by engine)
                    aiActionInProgress.current = false;
                }
                break;
            }

            default: {
                // For any other unexpected phase
                aiActionInProgress.current = false;
                break;
            }
        }
    }, [gameState, gameConfig, appState, isRolling, isMoving, handleRoll, executeMove]);

    return { aiActionInProgress };
};
