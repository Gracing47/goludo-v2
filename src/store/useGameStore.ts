/**
 * Game Store - Zustand State Management (v2)
 * 
 * Unified state management for GoLudo following 2025 best practices:
 * - Single source of truth for all game state
 * - Atomic selectors for optimized re-renders
 * - subscribeWithSelector for socket event integration
 * - Transient updates for animation states
 * 
 * @see https://github.com/pmndrs/zustand
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { GameStoreState, GameConfig, GameState, PayoutProof } from '../types';

/**
 * Game Store - Single Source of Truth
 * 
 * @example
 * ```tsx
 * // Use atomic selectors for performance
 * const isRolling = useGameStore((s) => s.isRolling);
 * const setIsRolling = useGameStore((s) => s.setIsRolling);
 * 
 * // Or use useShallow for multiple values
 * const { isRolling, isMoving } = useGameStore(
 *   useShallow((s) => ({ isRolling: s.isRolling, isMoving: s.isMoving }))
 * );
 * ```
 */
export const useGameStore = create<GameStoreState>()(
    devtools(
        subscribeWithSelector((set, get) => ({
            // ============================================
            // STATE
            // ============================================

            /** Application state (lobby or game) */
            appState: 'lobby',

            /** Game configuration */
            config: null,

            /** Current game state from engine */
            state: null,

            /** Dice rolling animation */
            isRolling: false,

            /** Token moving animation */
            isMoving: false,

            /** Board rotation for local player perspective */
            boardRotation: 0,

            /** Turn timer countdown (seconds) */
            turnTimer: null,

            /** Server message toast */
            serverMsg: null,

            /** Socket.io instance for multiplayer */
            socket: null,

            /** Screen shake effect */
            isShaking: false,

            /** Local player index in multiplayer match */
            myPlayerIndex: null,

            /** Payout proof for Web3 claims */
            payoutProof: null,
            /** User selected color from lobby */
            mySelectedColor: null,

            // ============================================
            // ACTIONS
            // ============================================

            /** Set application state */
            setAppState: (appState) => set({ appState }, false, 'setAppState'),

            /** Set game configuration */
            setConfig: (config) => set({ config }, false, 'setConfig'),

            /** 
             * Set full game state
             * Supports functional updates like setState(prev => ...)
             */
            setState: (stateOrFn) => set((prev) => ({
                state: typeof stateOrFn === 'function' ? stateOrFn(prev.state) : stateOrFn
            }), false, 'setState'),

            /** 
             * Update game state partially (merges with existing)
             * Useful for socket updates that only contain changed fields
             */
            updateState: (partial) => set((prev) => ({
                state: prev.state ? { ...prev.state, ...partial } : null
            }), false, 'updateState'),

            /** Set rolling animation state (transient for performance) */
            setIsRolling: (isRolling) => set({ isRolling }, false, 'setIsRolling'),

            /** Set moving animation state (transient for performance) */
            setIsMoving: (isMoving) => set({ isMoving }, false, 'setIsMoving'),

            /** Set board rotation angle */
            setBoardRotation: (rotation) => set({ boardRotation: rotation }, false, 'setBoardRotation'),

            /** Set turn timer countdown */
            setTurnTimer: (seconds) => set({ turnTimer: seconds }, false, 'setTurnTimer'),

            /** Set server message */
            setServerMsg: (msg) => set({ serverMsg: msg }, false, 'setServerMsg'),

            /** Initialize game with config (convenience action) */
            initGame: (config) => set({ config, appState: 'game' }, false, 'initGame'),

            /** Set socket instance */
            setSocket: (socket) => set({ socket }, false, 'setSocket'),

            /** Set screen shake state */
            setIsShaking: (isShaking) => set({ isShaking }, false, 'setIsShaking'),

            /** Set local player index */
            setMyPlayerIndex: (index) => set({ myPlayerIndex: index }, false, 'setMyPlayerIndex'),

            /** Set payout proof for Web3 claims */
            setPayoutProof: (proof) => set({ payoutProof: proof }, false, 'setPayoutProof'),
            /** Set user selected color */
            setMySelectedColor: (color) => set({ mySelectedColor: color }, false, 'setMySelectedColor'),

            /** Reset all state to initial values */
            reset: () => set({
                appState: 'lobby',
                config: null,
                state: null,
                isRolling: false,
                isMoving: false,
                boardRotation: 0,
                turnTimer: null,
                serverMsg: null,
                socket: null,
                myPlayerIndex: null,
                payoutProof: null,
                mySelectedColor: null,
                isShaking: false,
            }, false, 'reset'),
        })),
        {
            name: 'game-store',
            enabled: import.meta.env.DEV,
        }
    )
);

/**
 * Selectors for optimized component subscriptions
 * 
 * @example
 * ```tsx
 * function PlayerList() {
 *   // Only re-renders when active player changes
 *   const activePlayer = useGameStore(selectActivePlayer);
 *   return <div>Current: {activePlayer}</div>;
 * }
 * ```
 */
export const selectGameState = (state: GameStoreState) => state.state;
export const selectGameConfig = (state: GameStoreState) => state.config;
export const selectIsRolling = (state: GameStoreState) => state.isRolling;
export const selectIsMoving = (state: GameStoreState) => state.isMoving;
export const selectTurnTimer = (state: GameStoreState) => state.turnTimer;
export const selectServerMsg = (state: GameStoreState) => state.serverMsg;

/**
 * Derived selectors (computed values)
 */
export const selectActivePlayer = (state: GameStoreState) =>
    state.state?.activePlayer ?? null;

export const selectCurrentPhase = (state: GameStoreState) =>
    state.state?.gamePhase ?? null;

export const selectDiceValue = (state: GameStoreState) =>
    state.state?.diceValue ?? null;

export const selectValidMoves = (state: GameStoreState) =>
    state.state?.validMoves ?? [];

/**
 * Subscribe to specific state changes
 * 
 * @example
 * ```tsx
 * useEffect(() => {
 *   const unsubscribe = useGameStore.subscribe(
 *     selectActivePlayer,
 *     (activePlayer) => {
 *       console.log('Active player changed:', activePlayer);
 *     }
 *   );
 *   return unsubscribe;
 * }, []);
 * ```
 */
