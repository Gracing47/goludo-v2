/**
 * Game Store - Zustand State Management
 * 
 * Manages active game state including:
 * - Game configuration
 * - Current game state (board, tokens, turn)
 * - Animation states (rolling, moving)
 * - UI state (timer, messages)
 * 
 * Designed for high-frequency updates with minimal re-renders.
 * Uses transient updates for animation states.
 * 
 * @see https://github.com/pmndrs/zustand
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { GameStoreState, GameConfig, GameState } from '@types/index';

/**
 * Game Store
 * 
 * @example
 * ```tsx
 * function GameBoard() {
 *   const state = useGameStore(selectGameState);
 *   const setIsRolling = useGameStore((s) => s.setIsRolling);
 *   
 *   return (
 *     <Board gameState={state}>
 *       <Dice onRoll={() => setIsRolling(true)} />
 *     </Board>
 *   );
 * }
 * ```
 */
export const useGameStore = create<GameStoreState>()(
    devtools(
        subscribeWithSelector((set) => ({
            // State
            config: null,
            state: null,
            isRolling: false,
            isMoving: false,
            boardRotation: 0,
            turnTimer: null,
            serverMsg: null,
            socket: null,
            myPlayerIndex: null,

            // Actions
            setConfig: (config) => set({ config }, false, 'setConfig'),

            setState: (state) => set({ state }, false, 'setState'),

            /**
             * Set rolling animation state
             * Uses transient update for performance
             */
            setIsRolling: (isRolling) => set({ isRolling }, true, 'setIsRolling'),

            /**
             * Set moving animation state
             * Uses transient update for performance
             */
            setIsMoving: (isMoving) => set({ isMoving }, true, 'setIsMoving'),

            setBoardRotation: (rotation) => set({ boardRotation: rotation }, false, 'setBoardRotation'),

            setTurnTimer: (seconds) => set({ turnTimer: seconds }, false, 'setTurnTimer'),

            setServerMsg: (msg) => set({ serverMsg: msg }, false, 'setServerMsg'),

            initGame: (config) => set({ config }, false, 'initGame'),

            setSocket: (socket) => set({ socket }, false, 'setSocket'),

            setMyPlayerIndex: (index) => set({ myPlayerIndex: index }, false, 'setMyPlayerIndex'),

            reset: () => set({
                config: null,
                state: null,
                isRolling: false,
                isMoving: false,
                boardRotation: 0,
                turnTimer: null,
                serverMsg: null,
                socket: null,
                myPlayerIndex: null,
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
