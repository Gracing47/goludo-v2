import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/shallow';
import { calculateAIMove } from '../engine/aiEngine';

/**
 * useGameAI Hook
 * 
 * Manages AI turn logic. Listens for game state transitions where it's 
 * an AI's turn and triggers the appropriate actions with natural delays.
 */
export const useGameAI = (handleRoll: () => void, executeMove: (move: any) => void) => {
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

        // Stop if game is won
        if (gameState.gamePhase === 'WIN') return;

        const currentPlayer = gameConfig.players[gameState.activePlayer];
        if (!currentPlayer?.isAI) return;

        aiActionInProgress.current = true;

        // --- PHASE: ROLL_DICE ---
        if (gameState.gamePhase === 'ROLL_DICE') {
            const delay = 800 + Math.random() * 500;
            const timer = setTimeout(() => {
                handleRoll();
            }, delay);
            return () => {
                clearTimeout(timer);
                aiActionInProgress.current = false;
            };
        }

        // --- PHASE: SELECT_TOKEN / BONUS_MOVE ---
        if ((gameState.gamePhase === 'SELECT_TOKEN' || gameState.gamePhase === 'BONUS_MOVE') &&
            gameState.validMoves.length > 0) {

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
        }

        // --- PHASE: NO MOVES ---
        // If turn skipped or no moves, reset lock so next turn can proceed
        if (gameState.validMoves.length === 0 && gameState.gamePhase !== 'ROLL_DICE') {
            aiActionInProgress.current = false;
        }
    }, [gameState, gameConfig, appState, isRolling, isMoving, handleRoll, executeMove]);

    return { aiActionInProgress };
};
