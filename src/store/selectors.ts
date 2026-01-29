/**
 * Zustand Selectors - Atomic & Optimized
 * 
 * Following 2025 best practices:
 * - Atomic selectors for single values (prevents re-renders)
 * - useShallow for multiple values that change together
 * - Computed selectors for derived state
 * 
 * @example
 * ```tsx
 * // Single value - only re-renders when this value changes
 * const isRolling = useIsRolling();
 * 
 * // Multiple values - shallow comparison
 * const { isRolling, isMoving, turnTimer } = useGameUI();
 * ```
 */

import { useGameStore } from './useGameStore';
import { useShallow } from 'zustand/shallow';
import type { GameStoreState, GameState } from '../types';

// ============================================
// ATOMIC SELECTORS (Single Value)
// Best for values that change independently
// ============================================

/** Application state (lobby/game) */
export const useAppState = () => useGameStore((s) => s.appState);

/** Dice rolling animation state */
export const useIsRolling = () => useGameStore((s) => s.isRolling);

/** Token moving animation state */
export const useIsMoving = () => useGameStore((s) => s.isMoving);

/** Turn timer countdown (seconds) */
export const useTurnTimer = () => useGameStore((s) => s.turnTimer);

/** Server message for toast display */
export const useServerMsg = () => useGameStore((s) => s.serverMsg);

/** Board rotation angle */
export const useBoardRotation = () => useGameStore((s) => s.boardRotation);

/** Local player index in multiplayer */
export const useMyPlayerIndex = () => useGameStore((s) => s.myPlayerIndex);

/** Payout proof for Web3 claims */
export const usePayoutProof = () => useGameStore((s) => s.payoutProof);

// ============================================
// COMPUTED SELECTORS (Derived from GameState)
// ============================================

/** Active player index (0-3) */
export const useActivePlayer = () =>
    useGameStore((s) => s.state?.activePlayer ?? null);

/** Current game phase */
export const useGamePhase = () =>
    useGameStore((s) => s.state?.gamePhase ?? null);

/** Last dice roll value */
export const useDiceValue = () =>
    useGameStore((s) => s.state?.diceValue ?? null);

/** Valid moves for current player */
export const useValidMoves = () =>
    useGameStore((s) => s.state?.validMoves ?? []);

/** Token positions array */
export const useTokens = () =>
    useGameStore((s) => s.state?.tokens ?? []);

/** Winner player index (null if no winner) */
export const useWinner = () =>
    useGameStore((s) => s.state?.winner ?? null);

/** Game message */
export const useGameMessage = () =>
    useGameStore((s) => s.state?.message ?? null);

/** Whether game is in win state */
export const useIsGameWon = () =>
    useGameStore((s) => s.state?.gamePhase === 'WIN');

/** Whether it's time to roll dice */
export const useCanRoll = () =>
    useGameStore((s) => {
        const gs = s.state;
        return gs?.gamePhase === 'ROLL_DICE' && !s.isRolling && !s.isMoving;
    });

/** Whether player can select a token */
export const useCanSelectToken = () =>
    useGameStore((s) => {
        const gs = s.state;
        return (gs?.gamePhase === 'SELECT_TOKEN' || gs?.gamePhase === 'BONUS_MOVE')
            && !s.isMoving;
    });

// ============================================
// SHALLOW SELECTORS (Multiple Values)
// Use when multiple values change together
// ============================================

/** UI animation states */
export const useGameUI = () => useGameStore(
    useShallow((s) => ({
        isRolling: s.isRolling,
        isMoving: s.isMoving,
        turnTimer: s.turnTimer,
        serverMsg: s.serverMsg,
    }))
);

/** Player information for HUD */
export const usePlayerInfo = () => useGameStore(
    useShallow((s) => ({
        myPlayerIndex: s.myPlayerIndex,
        activePlayer: s.state?.activePlayer ?? null,
        players: s.config?.players ?? [],
        gameMode: s.config?.mode ?? null,
    }))
);

/** Game phase and dice info */
export const useTurnInfo = () => useGameStore(
    useShallow((s) => ({
        gamePhase: s.state?.gamePhase ?? null,
        diceValue: s.state?.diceValue ?? null,
        validMoves: s.state?.validMoves ?? [],
        activePlayer: s.state?.activePlayer ?? null,
    }))
);

/** Full game configuration */
export const useGameConfig = () => useGameStore((s) => s.config);

/** Full game state (use sparingly) */
export const useGameState = () => useGameStore((s) => s.state);

// ============================================
// ACTION SELECTORS
// Return only the action functions
// ============================================

/** Get all state setters */
export const useGameActions = () => useGameStore(
    useShallow((s) => ({
        setAppState: s.setAppState,
        setConfig: s.setConfig,
        setGameState: s.setGameState,
        updateState: s.updateState,
        setIsRolling: s.setIsRolling,
        setIsMoving: s.setIsMoving,
        setBoardRotation: s.setBoardRotation,
        setTurnTimer: s.setTurnTimer,
        setServerMsg: s.setServerMsg,
        initGame: s.initGame,
        setSocket: s.setSocket,
        setMyPlayerIndex: s.setMyPlayerIndex,
        setPayoutProof: s.setPayoutProof,
        reset: s.reset,
    }))
);

// ============================================
// LEGACY FUNCTION SELECTORS
// For backward compatibility with existing code
// ============================================

export const selectGameState = (state: GameStoreState) => state.state;
export const selectGameConfig = (state: GameStoreState) => state.config;
export const selectIsRolling = (state: GameStoreState) => state.isRolling;
export const selectIsMoving = (state: GameStoreState) => state.isMoving;
export const selectTurnTimer = (state: GameStoreState) => state.turnTimer;
export const selectServerMsg = (state: GameStoreState) => state.serverMsg;
export const selectActivePlayer = (state: GameStoreState) => state.state?.activePlayer ?? null;
export const selectCurrentPhase = (state: GameStoreState) => state.state?.gamePhase ?? null;
export const selectDiceValue = (state: GameStoreState) => state.state?.diceValue ?? null;
export const selectValidMoves = (state: GameStoreState) => state.state?.validMoves ?? [];
